import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { IsMoneyString } from '../../../common/decorators/is-money-string.decorator.js';

export class UpdateClaimDto {
  @ApiProperty({
    description: 'Expected claim version for optimistic concurrency control',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  expectedVersion: number;

  @ApiPropertyOptional({ description: 'Loss date (YYYY-MM-DD)', example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  lossDate?: string;

  @ApiPropertyOptional({ description: 'Date notified (YYYY-MM-DD)', example: '2026-03-16' })
  @IsOptional()
  @IsDateString()
  dateNotified?: string;

  @ApiPropertyOptional({
    description: 'Nature and details of the loss incident',
    example: 'Updated details on collision.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  lossNature?: string;

  @ApiPropertyOptional({
    description: 'Estimated loss amount in claim currency',
    example: '18000.00',
  })
  @IsOptional()
  @IsMoneyString({ allowZero: true })
  estimatedLossAmount?: string;
}
