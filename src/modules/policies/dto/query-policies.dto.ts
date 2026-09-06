import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Currency, PolicyStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryPoliciesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by policy currency',
    enum: Currency,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Filter by policy status',
    enum: PolicyStatus,
  })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;
}
