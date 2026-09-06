import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RiskCoverStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryRiskCoversDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by risk cover status',
    enum: RiskCoverStatus,
  })
  @IsOptional()
  @IsEnum(RiskCoverStatus)
  status?: RiskCoverStatus;
}
