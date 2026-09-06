import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, ClaimPayment } from '@prisma/client';
import { DecimalMath } from '../../../common/utils/decimal.util.js';

export class ClaimPaymentResponseDto {
  @ApiProperty({ description: 'UUID primary key' })
  id: string;

  @ApiProperty({ description: 'Claim UUID foreign key' })
  claimId: string;

  @ApiProperty({ description: 'Payment date (YYYY-MM-DD)', example: '2026-04-01' })
  paymentDate: string;

  @ApiProperty({ description: 'Amount in original payment currency', example: '5000.00' })
  amount: string;

  @ApiProperty({ description: 'Original payment currency', enum: Currency, example: Currency.USD })
  currency: Currency;

  @ApiProperty({ description: 'Locked exchange rate sheet UUID' })
  exchangeRateSheetId: string;

  @ApiPropertyOptional({ description: 'Exchange rate entry UUID (null for same currency)' })
  exchangeRateEntryId: string | null;

  @ApiProperty({ description: 'Applied conversion rate as fixed 4-decimal string', example: '1.0000' })
  appliedRate: string;

  @ApiProperty({ description: 'Authoritative converted amount in claim currency', example: '5000.00' })
  amountInClaimCurrency: string;

  @ApiPropertyOptional({ description: 'Payment reference' })
  reference: string | null;

  @ApiProperty({ description: 'UTC creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Server-derived actor' })
  createdBy: string;

  static fromEntity(entity: ClaimPayment): ClaimPaymentResponseDto {
    return {
      id: entity.id,
      claimId: entity.claimId,
      paymentDate: entity.paymentDate.toISOString().substring(0, 10),
      amount: DecimalMath.formatMoney(entity.amount),
      currency: entity.currency,
      exchangeRateSheetId: entity.exchangeRateSheetId,
      exchangeRateEntryId: entity.exchangeRateEntryId,
      appliedRate: DecimalMath.formatRate(entity.appliedRate),
      amountInClaimCurrency: DecimalMath.formatMoney(entity.amountInClaimCurrency),
      reference: entity.reference,
      createdAt: entity.createdAt.toISOString(),
      createdBy: entity.createdBy,
    };
  }
}
