import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { IsMoneyString } from '../../../common/decorators/is-money-string.decorator.js';

export class UpdateApprovedPayoutDto {
  @ApiProperty({
    description: 'Approved payout amount in claim currency (non-negative monetary string)',
    example: '12000.00',
  })
  @IsMoneyString({ allowZero: true })
  @IsNotEmpty()
  approvedPayoutAmount: string;

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
    description: 'Explicit confirmation flag if this change reduces payout below total paid amount',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmOverpayment?: boolean = false;
}

export class ClearApprovedPayoutDto {
  @ApiProperty({
    description: 'Expected claim version for optimistic concurrency control',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  expectedVersion: number;
}
