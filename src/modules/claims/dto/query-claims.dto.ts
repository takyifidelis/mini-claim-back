import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { IsUUID } from '../../../common/decorators/is-uuid.decorator.js';
import { Currency } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export enum DerivedClaimStatus {
  UNDER_REVIEW = 'UNDER_REVIEW',
  DENIED = 'DENIED',
  RESERVED_NOT_SETTLED = 'RESERVED_NOT_SETTLED',
  PAYMENT_OUTSTANDING = 'PAYMENT_OUTSTANDING',
  PAID = 'PAID',
}

export class QueryClaimsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by notification date from (inclusive, YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateNotifiedFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by notification date to (inclusive, YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateNotifiedTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by derived claim lifecycle status',
    enum: DerivedClaimStatus,
  })
  @IsOptional()
  @IsEnum(DerivedClaimStatus)
  status?: DerivedClaimStatus;

  @ApiPropertyOptional({
    description: 'Filter by claim/policy currency',
    enum: Currency,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Filter by policy UUID',
  })
  @IsOptional()
  @IsUUID()
  policyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by policy risk cover UUID',
  })
  @IsOptional()
  @IsUUID()
  policyRiskCoverId?: string;
}
