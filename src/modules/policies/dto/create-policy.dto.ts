import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Currency, PolicyStatus } from '@prisma/client';
import { IsMoneyString } from '../../../common/decorators/is-money-string.decorator.js';
import { CreatePolicyCoverDto } from './create-policy-cover.dto.js';

export class CreatePolicyDto {
  @ApiProperty({
    description: 'Insured person or company name',
    example: 'Acme Logistics Ltd',
    maxLength: 200,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  insuredName: string;

  @ApiProperty({
    description: 'Policy type / product line',
    example: 'Commercial Property',
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  policyType: string;

  @ApiProperty({
    description: 'Start date of coverage (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date of coverage (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Policy currency (GHS, USD, EUR)',
    enum: Currency,
    example: Currency.USD,
  })
  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @ApiProperty({
    description: 'Total sum insured in policy currency (non-negative monetary amount string)',
    example: '100000.00',
  })
  @IsMoneyString({ allowZero: true })
  @IsNotEmpty()
  sumInsured: string;

  @ApiPropertyOptional({
    description: 'Premium amount in policy currency (non-negative monetary amount string)',
    example: '2500.00',
  })
  @IsOptional()
  @IsMoneyString({ allowZero: true })
  premiumAmount?: string;

  @ApiPropertyOptional({
    description: 'Policy status',
    enum: PolicyStatus,
    default: PolicyStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus = PolicyStatus.ACTIVE;

  @ApiProperty({
    description: 'List of assigned risk covers with limits and deductibles',
    type: [CreatePolicyCoverDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePolicyCoverDto)
  covers: CreatePolicyCoverDto[];
}
