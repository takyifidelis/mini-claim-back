import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Currency } from '@prisma/client';
import { IsMoneyString } from '../../../common/decorators/is-money-string.decorator.js';

export class CreateClaimPaymentDto {
  @ApiProperty({ description: 'Payment date (YYYY-MM-DD)', example: '2026-04-01' })
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @ApiProperty({
    description: 'Payment amount in original payment currency (strictly positive monetary string)',
    example: '5000.00',
  })
  @IsMoneyString({ allowZero: false })
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Original payment currency (GHS, USD, EUR)',
    enum: Currency,
    example: Currency.USD,
  })
  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Payment reference identifier / transaction code',
    example: 'BANK-TRF-987654',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiProperty({
    description: 'Expected claim version for optimistic concurrency control',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  expectedVersion: number;

  @ApiPropertyOptional({
    description: 'Explicit confirmation flag if this payment results in an overpaid claim balance',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmOverpayment?: boolean = false;
}
