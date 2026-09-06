import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsRateString } from '../../../common/decorators/is-rate-string.decorator.js';

export class CreateExchangeRateSheetDto {
  @ApiProperty({
    description: 'Effective UTC timestamp (ISO-8601 string)',
    example: '2026-09-05T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  effectiveAt: string;

  @ApiPropertyOptional({
    description: 'Optional description or notes for this rate sheet',
    example: 'Daily official central bank published exchange rates.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'GHS value of one USD (Bank of Ghana 4-decimal standard, e.g. "15.5412")',
    example: '15.5412',
  })
  @IsRateString()
  @IsNotEmpty()
  usdToGhsRate: string;

  @ApiProperty({
    description: 'GHS value of one EUR (Bank of Ghana 4-decimal standard, e.g. "16.8245")',
    example: '16.8245',
  })
  @IsRateString()
  @IsNotEmpty()
  eurToGhsRate: string;
}
