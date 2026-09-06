import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';
import { DecimalMath } from '../../common/utils/decimal.util.js';
import { CreateExchangeRateSheetDto } from './dto/create-exchange-rate-sheet.dto.js';
import { QueryExchangeRateSheetsDto } from './dto/query-exchange-rate-sheets.dto.js';
import {
  ExchangeRateSheetDetailDto,
  ExchangeRateSheetSummaryDto,
} from './dto/exchange-rate-sheet-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

@Injectable()
export class ExchangeRateSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actorProvider: ActorProvider,
  ) {}

  /**
   * Creates an immutable exchange rate sheet containing all 6 server-derived directed pairs.
   *
   * @param dto - Create DTO with effectiveAt, notes, and USD/EUR equivalents in GHS
   * @returns The created exchange rate sheet detail with entries
   */
  async create(dto: CreateExchangeRateSheetDto): Promise<ExchangeRateSheetDetailDto> {
    const effectiveAtDate = new Date(dto.effectiveAt);
    if (isNaN(effectiveAtDate.getTime())) {
      throw new BadRequestException('Invalid effectiveAt date format.');
    }

    // Check uniqueness of effectiveAt
    const existingSheet = await this.prisma.exchangeRateSheet.findUnique({
      where: { effectiveAt: effectiveAtDate },
    });
    if (existingSheet) {
      throw new ConflictException(
        `An exchange rate sheet already exists with effectiveAt = "${effectiveAtDate.toISOString()}".`
      );
    }

    const entries = this.buildRequiredEntries(dto.usdToGhsRate, dto.eurToGhsRate);

    const createdBy = this.actorProvider.getActor();
    const reference = await this.prisma.getNextFxSheetReference(effectiveAtDate);

    // Save in transaction
    const sheet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.exchangeRateSheet.create({
        data: {
          reference,
          effectiveAt: effectiveAtDate,
          notes: dto.notes,
          createdBy,
          entries: {
            create: entries.map((entry) => ({
              fromCurrency: entry.fromCurrency,
              toCurrency: entry.toCurrency,
              rate: DecimalMath.formatRate(entry.rate),
            })),
          },
        },
        include: {
          entries: true,
        },
      });
      return created;
    });

    return ExchangeRateSheetDetailDto.fromEntityWithEntries(sheet);
  }

  /**
   * Finds the current active exchange rate sheet at time T (greatest effectiveAt <= T).
   *
   * @param asOfDate - Point in time (defaults to now)
   * @returns The active exchange rate sheet detail with all entries
   * @throws NotFoundException if no active sheet is found
   */
  async getCurrentSheet(asOfDate: Date = new Date()): Promise<ExchangeRateSheetDetailDto> {
    const sheet = await this.prisma.exchangeRateSheet.findFirst({
      where: {
        effectiveAt: {
          lte: asOfDate,
        },
      },
      orderBy: {
        effectiveAt: 'desc',
      },
      include: {
        entries: true,
      },
    });

    if (!sheet) {
      throw new NotFoundException(
        `No active exchange rate sheet found effective at or before ${asOfDate.toISOString()}.`
      );
    }

    return ExchangeRateSheetDetailDto.fromEntityWithEntries(sheet);
  }

  /**
   * Finds all exchange rate sheets with pagination, search, and sorting.
   *
   * @param query - Query filter parameters
   * @returns Paginated list of sheet summaries
   */
  async findAll(
    query: QueryExchangeRateSheetsDto
  ): Promise<PaginatedResponseDto<ExchangeRateSheetSummaryDto>> {
    const { page = 1, pageSize = 10, search, sortBy, sortDirection = 'desc' } = query;

    const where: Prisma.ExchangeRateSheetWhereInput = {};

    if (search && search.trim()) {
      const trimmed = search.trim();
      where.OR = [
        { reference: { contains: trimmed, mode: 'insensitive' } },
        { notes: { contains: trimmed, mode: 'insensitive' } },
        { createdBy: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['effectiveAt', 'createdAt', 'reference'];
    const sortField = sortBy && validSortFields.includes(sortBy) ? sortBy : 'effectiveAt';

    const orderBy: Prisma.ExchangeRateSheetOrderByWithRelationInput[] = [
      { [sortField]: sortDirection },
      { id: 'asc' },
    ];

    const [totalItems, records] = await Promise.all([
      this.prisma.exchangeRateSheet.count({ where }),
      this.prisma.exchangeRateSheet.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          entries: {
            where: {
              OR: [
                { fromCurrency: Currency.USD, toCurrency: Currency.GHS },
                { fromCurrency: Currency.EUR, toCurrency: Currency.GHS },
              ],
            },
          },
        },
      }),
    ]);

    const items = records.map((r) => ExchangeRateSheetSummaryDto.fromEntity(r));
    return new PaginatedResponseDto(items, totalItems, page, pageSize);
  }

  /**
   * Finds a single exchange rate sheet by UUID with all its rate entries.
   *
   * @param id - Sheet UUID
   * @returns Sheet detail with entries
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<ExchangeRateSheetDetailDto> {
    const sheet = await this.prisma.exchangeRateSheet.findUnique({
      where: { id },
      include: {
        entries: true,
      },
    });

    if (!sheet) {
      throw new NotFoundException(`Exchange rate sheet with ID "${id}" not found.`);
    }

    return ExchangeRateSheetDetailDto.fromEntityWithEntries(sheet);
  }

  private buildRequiredEntries(
    usdToGhsRate: string,
    eurToGhsRate: string
  ): { fromCurrency: Currency; toCurrency: Currency; rate: string }[] {
    if (!DecimalMath.isValidRate(usdToGhsRate) || !DecimalMath.isValidRate(eurToGhsRate)) {
      throw new BadRequestException('USD and EUR equivalents in GHS must be positive decimal strings.');
    }

    const usdToGhs = DecimalMath.from(usdToGhsRate);
    const eurToGhs = DecimalMath.from(eurToGhsRate);

    return [
      { fromCurrency: 'GHS', toCurrency: 'USD', rate: DecimalMath.formatRate(DecimalMath.div(1, usdToGhs)) },
      { fromCurrency: 'USD', toCurrency: 'GHS', rate: DecimalMath.formatRate(usdToGhs) },
      { fromCurrency: 'GHS', toCurrency: 'EUR', rate: DecimalMath.formatRate(DecimalMath.div(1, eurToGhs)) },
      { fromCurrency: 'EUR', toCurrency: 'GHS', rate: DecimalMath.formatRate(eurToGhs) },
      { fromCurrency: 'USD', toCurrency: 'EUR', rate: DecimalMath.formatRate(DecimalMath.div(usdToGhs, eurToGhs)) },
      { fromCurrency: 'EUR', toCurrency: 'USD', rate: DecimalMath.formatRate(DecimalMath.div(eurToGhs, usdToGhs)) },
    ];
  }
}
