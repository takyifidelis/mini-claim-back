import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (allowed: 5, 10, 20)',
    default: 10,
    enum: [5, 10, 20],
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([5, 10, 20])
  pageSize: number = 10;

  @ApiPropertyOptional({
    description: 'Search text (case-insensitive, trimmed)',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction (asc or desc)',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'desc';
}
