import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';
import { CreateRiskCoverDto } from './dto/create-risk-cover.dto.js';
import { QueryRiskCoversDto } from './dto/query-risk-covers.dto.js';
import { RiskCoverResponseDto } from './dto/risk-cover-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

/**
 * Service managing risk covers catalogue.
 */
@Injectable()
export class RiskCoversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actorProvider: ActorProvider,
  ) {}

  /**
   * Creates a new risk cover record.
   *
   * @param dto - Data transfer object for creation
   * @returns The created risk cover response DTO
   * @throws ConflictException if code already exists
   */
  async create(dto: CreateRiskCoverDto): Promise<RiskCoverResponseDto> {
    const existing = await this.prisma.riskCover.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Risk cover with code "${dto.code}" already exists.`);
    }

    const createdBy = this.actorProvider.getActor();

    const entity = await this.prisma.riskCover.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status ?? 'ACTIVE',
        createdBy,
      },
    });

    return RiskCoverResponseDto.fromEntity(entity);
  }

  /**
   * Finds all risk covers with pagination, search, and sorting.
   *
   * @param query - Query filter parameters
   * @returns Paginated list of risk cover response DTOs
   */
  async findAll(query: QueryRiskCoversDto): Promise<PaginatedResponseDto<RiskCoverResponseDto>> {
    const { page = 1, pageSize = 10, search, status, sortBy, sortDirection = 'desc' } = query;

    const where: Prisma.RiskCoverWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const trimmed = search.trim();
      where.OR = [
        { code: { contains: trimmed, mode: 'insensitive' } },
        { name: { contains: trimmed, mode: 'insensitive' } },
        { description: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    // Whitelist sort fields
    const validSortFields = ['code', 'name', 'status', 'createdAt'];
    const sortField = sortBy && validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const orderBy: Prisma.RiskCoverOrderByWithRelationInput[] = [
      { [sortField]: sortDirection },
      { id: 'asc' }, // deterministic secondary sort
    ];

    const [totalItems, records] = await Promise.all([
      this.prisma.riskCover.count({ where }),
      this.prisma.riskCover.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = records.map((r) => RiskCoverResponseDto.fromEntity(r));
    return new PaginatedResponseDto(items, totalItems, page, pageSize);
  }

  async findOptions(): Promise<RiskCoverResponseDto[]> {
    const records = await this.prisma.riskCover.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { code: 'asc' },
        { id: 'asc' },
      ],
    });

    return records.map((record) => RiskCoverResponseDto.fromEntity(record));
  }

  /**
   * Finds a single risk cover by UUID.
   *
   * @param id - UUID of the risk cover
   * @returns Risk cover response DTO
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<RiskCoverResponseDto> {
    const entity = await this.prisma.riskCover.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`Risk cover with ID "${id}" not found.`);
    }

    return RiskCoverResponseDto.fromEntity(entity);
  }
}
