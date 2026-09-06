import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';
import { DecimalMath } from '../../common/utils/decimal.util.js';
import { CreateClaimDto } from './dto/create-claim.dto.js';
import { UpdateClaimDto } from './dto/update-claim.dto.js';
import { CreateClaimReviewDto } from './dto/create-claim-review.dto.js';
import {
  UpdateApprovedPayoutDto,
  ClearApprovedPayoutDto,
} from './dto/update-approved-payout.dto.js';
import { QueryClaimsDto } from './dto/query-claims.dto.js';
import {
  ClaimDetailDto,
  ClaimSummaryDto,
  CurrencyTotalsDto,
  PaginatedClaimsResponseDto,
} from './dto/claim-response.dto.js';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actorProvider: ActorProvider,
  ) {}

  /**
   * Creates a new claim under review.
   *
   * @param dto - Create claim DTO
   * @returns Created claim detail DTO
   */
  async create(dto: CreateClaimDto): Promise<ClaimDetailDto> {
    const lossDate = new Date(dto.lossDate);
    const dateNotified = new Date(dto.dateNotified);

    if (isNaN(lossDate.getTime()) || isNaN(dateNotified.getTime())) {
      throw new BadRequestException('Invalid lossDate or dateNotified format.');
    }

    if (lossDate > dateNotified) {
      throw new BadRequestException(
        `lossDate (${dto.lossDate}) cannot be after dateNotified (${dto.dateNotified}).`
      );
    }

    // Verify policy and cover relationship
    const policy = await this.prisma.policy.findUnique({
      where: { id: dto.policyId },
      include: {
        policyRiskCovers: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID "${dto.policyId}" not found.`);
    }

    const assignedCover = policy.policyRiskCovers.find(
      (c) => c.id === dto.policyRiskCoverId
    );

    if (!assignedCover) {
      throw new BadRequestException(
        `Policy risk cover "${dto.policyRiskCoverId}" is not assigned to policy "${dto.policyId}".`
      );
    }

    // Verify lossDate falls within policy start and end date
    const policyStart = new Date(policy.startDate.toISOString().substring(0, 10));
    const policyEnd = new Date(policy.endDate.toISOString().substring(0, 10));
    const lossDateOnly = new Date(dto.lossDate);

    if (lossDateOnly < policyStart || lossDateOnly > policyEnd) {
      throw new BadRequestException(
        `lossDate (${dto.lossDate}) falls outside policy coverage period (${policy.startDate.toISOString().substring(0, 10)} to ${policy.endDate.toISOString().substring(0, 10)}).`
      );
    }

    const claimYear = lossDate.getUTCFullYear();
    const claimReference = await this.prisma.getNextClaimReference(claimYear);
    const createdBy = this.actorProvider.getActor();

    const claim = await this.prisma.claim.create({
      data: {
        claimReference,
        policyId: policy.id,
        policyRiskCoverId: assignedCover.id,
        currency: policy.currency,
        lossDate,
        dateNotified,
        lossNature: dto.lossNature.trim(),
        estimatedLossAmount: DecimalMath.from(dto.estimatedLossAmount).toFixed(2),
        version: 1,
        createdBy,
      },
      include: {
        policy: true,
        policyRiskCover: true,
        review: true,
        payments: true,
      },
    });

    return ClaimDetailDto.fromEntityWithDetails(claim);
  }

  /**
   * Updates claim eligibility facts while UNDER_REVIEW.
   *
   * @param id - Claim UUID
   * @param dto - Update claim DTO
   * @returns Updated claim detail DTO
   */
  async update(id: string, dto: UpdateClaimDto): Promise<ClaimDetailDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id },
        include: {
          policy: true,
          policyRiskCover: true,
          review: true,
          payments: true,
        },
      });

      if (!claim) {
        throw new NotFoundException(`Claim with ID "${id}" not found.`);
      }

      if (claim.review) {
        throw new UnprocessableEntityException(
          'Cannot edit eligibility facts once a claim has been reviewed.'
        );
      }

      if (claim.version !== dto.expectedVersion) {
        throw this.claimVersionConflict(dto.expectedVersion, claim.version);
      }

      const lossDateStr = dto.lossDate ?? claim.lossDate.toISOString().substring(0, 10);
      const dateNotifiedStr = dto.dateNotified ?? claim.dateNotified.toISOString().substring(0, 10);
      const lossDate = new Date(lossDateStr);
      const dateNotified = new Date(dateNotifiedStr);

      if (lossDate > dateNotified) {
        throw new BadRequestException(
          `lossDate (${lossDateStr}) cannot be after dateNotified (${dateNotifiedStr}).`
        );
      }

      const policyStart = new Date(claim.policy.startDate.toISOString().substring(0, 10));
      const policyEnd = new Date(claim.policy.endDate.toISOString().substring(0, 10));
      if (lossDate < policyStart || lossDate > policyEnd) {
        throw new BadRequestException(
          `lossDate (${lossDateStr}) falls outside policy coverage period (${claim.policy.startDate.toISOString().substring(0, 10)} to ${claim.policy.endDate.toISOString().substring(0, 10)}).`
        );
      }

      const updateResult = await tx.claim.updateMany({
        where: {
          id,
          version: dto.expectedVersion,
          review: { is: null },
        },
        data: {
          lossDate,
          dateNotified,
          lossNature: dto.lossNature !== undefined ? dto.lossNature.trim() : undefined,
          estimatedLossAmount:
            dto.estimatedLossAmount !== undefined
              ? DecimalMath.from(dto.estimatedLossAmount).toFixed(2)
              : undefined,
          version: claim.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw this.claimVersionConflict(dto.expectedVersion);
      }

      return tx.claim.findUniqueOrThrow({
        where: { id },
        include: {
          policy: true,
          policyRiskCover: true,
          review: true,
          payments: true,
        },
      });
    });

    return ClaimDetailDto.fromEntityWithDetails(updated);
  }

  /**
   * Records a one-time transactional review decision on a claim.
   *
   * @param id - Claim UUID
   * @param dto - Review DTO
   * @returns Claim detail DTO with recorded review
   */
  async createReview(id: string, dto: CreateClaimReviewDto): Promise<ClaimDetailDto> {
    const trimmedReason = dto.reason ? dto.reason.trim() : '';
    if (!trimmedReason) {
      throw new BadRequestException('A non-blank reason is required for review.');
    }

    const reviewedBy = this.actorProvider.getActor();

    const updatedClaim = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id },
        include: { review: true },
      });

      if (!claim) {
        throw new NotFoundException(`Claim with ID "${id}" not found.`);
      }

      if (claim.review) {
        throw new ConflictException('This claim has already been reviewed.');
      }

      if (claim.version !== dto.expectedVersion) {
        throw this.claimVersionConflict(dto.expectedVersion, claim.version);
      }

      const updateResult = await tx.claim.updateMany({
        where: {
          id,
          version: dto.expectedVersion,
          review: { is: null },
        },
        data: {
          version: claim.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw this.claimVersionConflict(dto.expectedVersion);
      }

      await tx.claimReview.create({
        data: {
          claimId: id,
          decision: dto.decision,
          reason: trimmedReason,
          reviewedBy,
        },
      });

      const res = await tx.claim.findUniqueOrThrow({
        where: { id },
        include: {
          policy: true,
          policyRiskCover: true,
          review: true,
          payments: true,
        },
      });

      return res;
    });

    return ClaimDetailDto.fromEntityWithDetails(updatedClaim);
  }

  private claimVersionConflict(expectedVersion: number, currentVersion?: number): HttpException {
    const currentVersionMessage =
      currentVersion === undefined ? '' : `, but current version is ${currentVersion}`;

    return new HttpException(
      {
        statusCode: HttpStatus.CONFLICT,
        code: 'CLAIM_VERSION_CONFLICT',
        message: `Claim version conflict. Expected version ${expectedVersion}${currentVersionMessage}.`,
        details: {
          expectedVersion,
          ...(currentVersion === undefined ? {} : { currentVersion }),
        },
      },
      HttpStatus.CONFLICT
    );
  }

  /**
   * Sets or updates approved payout amount on an approved claim.
   * Checks version for optimistic concurrency and enforces overpayment confirmation protocol.
   *
   * @param id - Claim UUID
   * @param dto - Payout DTO
   * @returns Claim detail DTO
   */
  async setApprovedPayout(id: string, dto: UpdateApprovedPayoutDto): Promise<ClaimDetailDto> {
    const updatedClaim = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id },
        include: {
          policy: true,
          policyRiskCover: true,
          review: true,
          payments: true,
        },
      });

      if (!claim) {
        throw new NotFoundException(`Claim with ID "${id}" not found.`);
      }

      if (!claim.review || claim.review.decision !== 'APPROVED') {
        throw new UnprocessableEntityException(
          'Approved payout can only be set on a review-approved claim.'
        );
      }

      // Optimistic concurrency check
      if (claim.version !== dto.expectedVersion) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'CLAIM_VERSION_CONFLICT',
            message: `Claim version conflict. Expected version ${dto.expectedVersion}, but current version is ${claim.version}.`,
            details: { currentVersion: claim.version, expectedVersion: dto.expectedVersion },
          },
          HttpStatus.CONFLICT
        );
      }

      // Validate payout does not exceed policy cover's coverage limit
      const payoutDec = DecimalMath.from(dto.approvedPayoutAmount);
      if (DecimalMath.isGreaterThan(payoutDec, claim.policyRiskCover.coverageLimit)) {
        throw new UnprocessableEntityException(
          `Approved payout (${DecimalMath.formatMoney(payoutDec)}) cannot exceed policy cover limit (${DecimalMath.formatMoney(claim.policyRiskCover.coverageLimit)}).`
        );
      }

      // Calculate total paid and proposed balance
      const totalPaidDec = (claim.payments || []).reduce(
        (sum, p) => DecimalMath.add(sum, p.amountInClaimCurrency),
        DecimalMath.from(0)
      );

      const proposedBalance = DecimalMath.sub(payoutDec, totalPaidDec);

      if (DecimalMath.isNegative(proposedBalance) && !dto.confirmOverpayment) {
        const absoluteOverpayment = DecimalMath.formatMoney(DecimalMath.abs(proposedBalance));
        const proposedSignedBalance = DecimalMath.formatMoney(proposedBalance);

        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
            message: 'This payout reduction would result in an overpaid claim balance.',
            details: {
              proposedSignedBalance,
              absoluteOverpayment,
              currency: claim.currency,
              currentClaimVersion: claim.version,
            },
          },
          HttpStatus.CONFLICT
        );
      }

      // Commit update with atomic optimistic concurrency predicate
      const updateRes = await tx.claim.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          approvedPayoutAmount: payoutDec.toFixed(2),
          version: claim.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updateRes.count === 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'CLAIM_VERSION_CONFLICT',
            message: `Claim was modified concurrently. Expected version ${dto.expectedVersion}.`,
            details: { expectedVersion: dto.expectedVersion },
          },
          HttpStatus.CONFLICT
        );
      }

      return tx.claim.findUniqueOrThrow({
        where: { id },
        include: {
          policy: true,
          policyRiskCover: true,
          review: true,
          payments: true,
        },
      });
    });

    return ClaimDetailDto.fromEntityWithDetails(updatedClaim);
  }

  /**
   * Clears approved payout amount back to null (only before first payment).
   *
   * @param id - Claim UUID
   * @param dto - Clear payout DTO with expectedVersion
   * @returns Claim detail DTO
   */
  async clearApprovedPayout(id: string, dto: ClearApprovedPayoutDto): Promise<ClaimDetailDto> {
    const updatedClaim = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id },
        include: {
          policy: true,
          policyRiskCover: true,
          review: true,
          payments: true,
        },
      });

      if (!claim) {
        throw new NotFoundException(`Claim with ID "${id}" not found.`);
      }

      if (claim.payments && claim.payments.length > 0) {
        throw new ConflictException(
          'Approved payout cannot be cleared after payments have been recorded for this claim.'
        );
      }

      if (claim.version !== dto.expectedVersion) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'CLAIM_VERSION_CONFLICT',
            message: `Claim version conflict. Expected version ${dto.expectedVersion}, but current version is ${claim.version}.`,
            details: { currentVersion: claim.version, expectedVersion: dto.expectedVersion },
          },
          HttpStatus.CONFLICT
        );
      }

      const updateRes = await tx.claim.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          approvedPayoutAmount: null,
          version: claim.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updateRes.count === 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'CLAIM_VERSION_CONFLICT',
            message: `Claim was modified concurrently. Expected version ${dto.expectedVersion}.`,
            details: { expectedVersion: dto.expectedVersion },
          },
          HttpStatus.CONFLICT
        );
      }

      return tx.claim.findUniqueOrThrow({
        where: { id },
        include: {
          policy: true,
          policyRiskCover: true,
          review: true,
          payments: true,
        },
      });
    });

    return ClaimDetailDto.fromEntityWithDetails(updatedClaim);
  }

  /**
   * Finds all claims with filters, search, pagination, and full-dataset grouped totals by currency.
   *
   * @param query - Query filter parameters
   * @returns Paginated claims response with totalsByCurrency
   */
  async findAll(query: QueryClaimsDto): Promise<PaginatedClaimsResponseDto> {
    const {
      page = 1,
      pageSize = 10,
      search,
      currency,
      status,
      policyId,
      policyRiskCoverId,
      dateNotifiedFrom,
      dateNotifiedTo,
      sortBy,
      sortDirection = 'desc',
    } = query;

    const where: Prisma.ClaimWhereInput = {};

    if (currency) {
      where.currency = currency;
    }

    if (policyId) {
      where.policyId = policyId;
    }

    if (policyRiskCoverId) {
      where.policyRiskCoverId = policyRiskCoverId;
    }

    if (dateNotifiedFrom || dateNotifiedTo) {
      where.dateNotified = {};
      if (dateNotifiedFrom) {
        where.dateNotified.gte = new Date(dateNotifiedFrom);
      }
      if (dateNotifiedTo) {
        where.dateNotified.lte = new Date(dateNotifiedTo);
      }
    }

    if (search && search.trim()) {
      const trimmed = search.trim();
      where.OR = [
        { claimReference: { contains: trimmed, mode: 'insensitive' } },
        { policy: { policyNumber: { contains: trimmed, mode: 'insensitive' } } },
        { policy: { insuredName: { contains: trimmed, mode: 'insensitive' } } },
        { lossNature: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    // Load matching claims with relations to compute derived status and grouped totals
    const allMatching = await this.prisma.claim.findMany({
      where,
      include: {
        policy: true,
        policyRiskCover: true,
        review: true,
        payments: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'asc' },
      ],
    });

    // Map to summaries with derived statuses
    let summaries = allMatching.map((c) => ClaimSummaryDto.fromEntityWithRelations(c));

    // If status filter is applied, filter on derived status
    if (status) {
      summaries = summaries.filter((s) => s.status === status);
    }

    // Compute totalsByCurrency across ALL filtered records (before pagination)
    const currencyMap = new Map<
      Currency,
      {
        totalEstimatedLoss: any;
        totalApprovedPayout: any;
        totalPaid: any;
        signedOutstandingBalance: any;
        unapprovedCount: number;
        totalClaims: number;
      }
    >();

    for (const item of summaries) {
      if (!currencyMap.has(item.currency)) {
        currencyMap.set(item.currency, {
          totalEstimatedLoss: DecimalMath.from(0),
          totalApprovedPayout: DecimalMath.from(0),
          totalPaid: DecimalMath.from(0),
          signedOutstandingBalance: DecimalMath.from(0),
          unapprovedCount: 0,
          totalClaims: 0,
        });
      }

      const group = currencyMap.get(item.currency)!;
      group.totalClaims += 1;
      group.totalEstimatedLoss = DecimalMath.add(group.totalEstimatedLoss, item.estimatedLossAmount);
      group.totalPaid = DecimalMath.add(group.totalPaid, item.totalPaid);

      if (item.approvedPayoutAmount !== null) {
        group.totalApprovedPayout = DecimalMath.add(group.totalApprovedPayout, item.approvedPayoutAmount);
        group.signedOutstandingBalance = DecimalMath.add(
          group.signedOutstandingBalance,
          item.outstandingBalance ?? '0.00'
        );
      } else {
        group.unapprovedCount += 1;
      }
    }

    const totalsByCurrency: CurrencyTotalsDto[] = Array.from(currencyMap.entries()).map(
      ([cur, data]) => ({
        currency: cur,
        totalEstimatedLoss: DecimalMath.formatMoney(data.totalEstimatedLoss),
        totalApprovedPayout: DecimalMath.formatMoney(data.totalApprovedPayout),
        totalPaid: DecimalMath.formatMoney(data.totalPaid),
        signedOutstandingBalance: DecimalMath.formatMoney(data.signedOutstandingBalance),
        unapprovedCount: data.unapprovedCount,
        totalClaims: data.totalClaims,
      })
    );

    // Sort if requested
    if (sortBy) {
      summaries.sort((a: any, b: any) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (valA === undefined) return 0;
        if (typeof valA === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(String(valB))
            : String(valB).localeCompare(valA);
        }
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    const totalItems = summaries.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = summaries.slice(startIndex, startIndex + pageSize);

    return new PaginatedClaimsResponseDto(
      paginatedItems,
      totalItems,
      page,
      pageSize,
      totalsByCurrency
    );
  }

  /**
   * Finds claim details by UUID with policy, cover snapshot, review, and payments.
   *
   * @param id - Claim UUID
   * @returns Claim detail DTO
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<ClaimDetailDto> {
    const claim = await this.prisma.claim.findUnique({
      where: { id },
      include: {
        policy: true,
        policyRiskCover: true,
        review: true,
        payments: true,
      },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID "${id}" not found.`);
    }

    return ClaimDetailDto.fromEntityWithDetails(claim);
  }
}
