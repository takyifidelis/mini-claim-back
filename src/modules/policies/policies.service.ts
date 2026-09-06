import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';
import { DecimalMath } from '../../common/utils/decimal.util.js';
import { CreatePolicyDto } from './dto/create-policy.dto.js';
import { QueryPoliciesDto } from './dto/query-policies.dto.js';
import { PolicyDetailDto, PolicySummaryDto } from './dto/policy-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

const SUPPORTED_CURRENCIES: Currency[] = ['GHS', 'USD', 'EUR'];

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actorProvider: ActorProvider,
  ) {}

  /**
   * Creates a new policy and assigns risk covers locking the current exchange rate sheet.
   * Runs inside a single transaction.
   *
   * @param dto - Create policy DTO
   * @returns Policy detail DTO with covers and locked rate sheet
   */
  async create(dto: CreatePolicyDto): Promise<PolicyDetailDto> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid start or end date format.');
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        `Policy startDate (${dto.startDate}) cannot be after endDate (${dto.endDate}).`
      );
    }

    if (!dto.covers || dto.covers.length === 0) {
      throw new BadRequestException('A policy must have at least one risk cover assigned.');
    }

    // Check for duplicate cover assignments
    const coverIds = new Set<string>();
    for (const cover of dto.covers) {
      if (coverIds.has(cover.riskCoverId)) {
        throw new BadRequestException(
          `Duplicate risk cover assignment with ID "${cover.riskCoverId}".`
        );
      }
      coverIds.add(cover.riskCoverId);

      // Validate coverageLimit > 0
      if (!DecimalMath.isPositive(cover.coverageLimit)) {
        throw new BadRequestException(
          `Coverage limit must be strictly positive for cover ID "${cover.riskCoverId}".`
        );
      }

      // Validate deductible <= coverageLimit
      const deductible = cover.deductibleAmount ?? '0.00';
      if (DecimalMath.isGreaterThan(deductible, cover.coverageLimit)) {
        throw new BadRequestException(
          `Deductible amount (${deductible}) cannot exceed coverage limit (${cover.coverageLimit}) for cover ID "${cover.riskCoverId}".`
        );
      }
    }

    // Execute in a single transaction
    const policy = await this.prisma.$transaction(async (tx) => {
      // 1. Confirm every referenced risk cover exists and is ACTIVE
      const requestedIds = Array.from(coverIds);
      const riskCovers = await tx.riskCover.findMany({
        where: {
          id: { in: requestedIds },
        },
      });

      if (riskCovers.length !== requestedIds.length) {
        const foundIds = new Set(riskCovers.map((c) => c.id));
        const missing = requestedIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Risk covers not found: ${missing.join(', ')}.`
        );
      }

      const inactiveCovers = riskCovers.filter((c) => c.status !== 'ACTIVE');
      if (inactiveCovers.length > 0) {
        throw new UnprocessableEntityException(
          `Cannot assign inactive risk cover(s): ${inactiveCovers.map((c) => c.code).join(', ')}.`
        );
      }

      const coverMap = new Map(riskCovers.map((c) => [c.id, c]));

      // 2. Find current active immutable exchange rate sheet at transaction time
      const now = new Date();
      const currentRateSheet = await tx.exchangeRateSheet.findFirst({
        where: {
          effectiveAt: {
            lte: now,
          },
        },
        orderBy: {
          effectiveAt: 'desc',
        },
        include: {
          entries: true,
        },
      });

      if (!currentRateSheet) {
        throw new UnprocessableEntityException(
          'Cannot create policy: No active exchange rate sheet is available in the system.'
        );
      }

      // 3. Verify rate sheet has direct entries from every other currency into policy currency
      const otherCurrencies = SUPPORTED_CURRENCIES.filter((c) => c !== dto.currency);
      for (const sourceCur of otherCurrencies) {
        const hasEntry = currentRateSheet.entries.some(
          (e) => e.fromCurrency === sourceCur && e.toCurrency === dto.currency
        );
        if (!hasEntry) {
          throw new UnprocessableEntityException(
            `Locked rate sheet "${currentRateSheet.reference}" is missing conversion entry ${sourceCur}->${dto.currency}.`
          );
        }
      }

      // 4. Generate policy number
      const policyYear = startDate.getUTCFullYear();
      const policyNumber = await this.prisma.getNextPolicyNumber(policyYear);
      const createdBy = this.actorProvider.getActor();

      // 5. Create policy and policy_risk_covers
      const createdPolicy = await tx.policy.create({
        data: {
          policyNumber,
          insuredName: dto.insuredName.trim(),
          policyType: dto.policyType.trim(),
          startDate,
          endDate,
          currency: dto.currency,
          sumInsured: DecimalMath.from(dto.sumInsured).toFixed(2),
          premiumAmount: dto.premiumAmount ? DecimalMath.from(dto.premiumAmount).toFixed(2) : null,
          exchangeRateSheetId: currentRateSheet.id,
          status: dto.status ?? 'ACTIVE',
          createdBy,
          policyRiskCovers: {
            create: dto.covers.map((c) => {
              const rc = coverMap.get(c.riskCoverId)!;
              return {
                riskCoverId: c.riskCoverId,
                coverCodeSnapshot: rc.code,
                coverNameSnapshot: rc.name,
                coverageLimit: DecimalMath.from(c.coverageLimit).toFixed(2),
                deductibleAmount: DecimalMath.from(c.deductibleAmount ?? '0.00').toFixed(2),
                terms: c.terms,
                createdBy,
              };
            }),
          },
        },
        include: {
          policyRiskCovers: true,
          exchangeRateSheet: true,
        },
      });

      return createdPolicy;
    });

    return PolicyDetailDto.fromEntityWithRelations(policy);
  }

  /**
   * Finds all policies with pagination, search, and filters.
   *
   * @param query - Query filter parameters
   * @returns Paginated policies
   */
  async findAll(query: QueryPoliciesDto): Promise<PaginatedResponseDto<PolicySummaryDto>> {
    const { page = 1, pageSize = 10, search, currency, status, sortBy, sortDirection = 'desc' } = query;

    const where: Prisma.PolicyWhereInput = {};

    if (currency) {
      where.currency = currency;
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const trimmed = search.trim();
      where.OR = [
        { policyNumber: { contains: trimmed, mode: 'insensitive' } },
        { insuredName: { contains: trimmed, mode: 'insensitive' } },
        { policyType: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['policyNumber', 'insuredName', 'startDate', 'endDate', 'createdAt', 'sumInsured'];
    const sortField = sortBy && validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const orderBy: Prisma.PolicyOrderByWithRelationInput[] = [
      { [sortField]: sortDirection },
      { id: 'asc' },
    ];

    const [totalItems, records] = await Promise.all([
      this.prisma.policy.count({ where }),
      this.prisma.policy.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = records.map((r) => PolicySummaryDto.fromEntity(r));
    return new PaginatedResponseDto(items, totalItems, page, pageSize);
  }

  async findOptions(): Promise<PolicySummaryDto[]> {
    const records = await this.prisma.policy.findMany({
      orderBy: [
        { policyNumber: 'asc' },
        { id: 'asc' },
      ],
    });

    return records.map((record) => PolicySummaryDto.fromEntity(record));
  }

  /**
   * Finds policy details by UUID including covers and locked rate sheet summary.
   *
   * @param id - Policy UUID
   * @returns Policy detail DTO
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<PolicyDetailDto> {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: {
        policyRiskCovers: true,
        exchangeRateSheet: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID "${id}" not found.`);
    }

    return PolicyDetailDto.fromEntityWithRelations(policy);
  }
}
