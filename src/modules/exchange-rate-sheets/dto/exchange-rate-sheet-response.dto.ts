import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, ExchangeRateSheet, ExchangeRateEntry } from '@prisma/client';
import { DecimalMath } from '../../../common/utils/decimal.util.js';

export class ExchangeRateEntryResponseDto {
  @ApiProperty({ description: 'UUID primary key' })
  id: string;

  @ApiProperty({ description: 'Exchange rate sheet foreign key' })
  exchangeRateSheetId: string;

  @ApiProperty({ description: 'Source currency', enum: Currency })
  fromCurrency: Currency;

  @ApiProperty({ description: 'Target currency', enum: Currency })
  toCurrency: Currency;

  @ApiProperty({ description: 'Exchange rate as fixed 4-decimal string', example: '15.5412' })
  rate: string;

  static fromEntity(entity: ExchangeRateEntry): ExchangeRateEntryResponseDto {
    return {
      id: entity.id,
      exchangeRateSheetId: entity.exchangeRateSheetId,
      fromCurrency: entity.fromCurrency,
      toCurrency: entity.toCurrency,
      rate: DecimalMath.formatRate(entity.rate),
    };
  }
}

export class ExchangeRateSheetSummaryDto {
  @ApiProperty({ description: 'UUID primary key' })
  id: string;

  @ApiProperty({ description: 'Sequential reference', example: 'FX-20260905-000001' })
  reference: string;

  @ApiProperty({ description: 'Effective UTC timestamp', example: '2026-09-05T00:00:00.000Z' })
  effectiveAt: string;

  @ApiPropertyOptional({ description: 'Notes or source' })
  notes: string | null;

  @ApiPropertyOptional({
    description: 'GHS value of one USD as a fixed 4-decimal string (Bank of Ghana standard)',
    example: '15.5412',
    nullable: true,
  })
  usdToGhsRate: string | null;

  @ApiPropertyOptional({
    description: 'GHS value of one EUR as a fixed 4-decimal string (Bank of Ghana standard)',
    example: '16.8245',
    nullable: true,
  })
  eurToGhsRate: string | null;

  @ApiProperty({ description: 'UTC creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Server-derived actor' })
  createdBy: string;

  static fromEntity(
    entity: ExchangeRateSheet & { entries?: ExchangeRateEntry[] },
  ): ExchangeRateSheetSummaryDto {
    const usdToGhs = entity.entries?.find(
      (entry) =>
        entry.fromCurrency === Currency.USD && entry.toCurrency === Currency.GHS,
    );
    const eurToGhs = entity.entries?.find(
      (entry) =>
        entry.fromCurrency === Currency.EUR && entry.toCurrency === Currency.GHS,
    );

    return {
      id: entity.id,
      reference: entity.reference,
      effectiveAt:
        entity.effectiveAt instanceof Date
          ? entity.effectiveAt.toISOString()
          : new Date(entity.effectiveAt).toISOString(),
      notes: entity.notes,
      usdToGhsRate: usdToGhs ? DecimalMath.formatRate(usdToGhs.rate) : null,
      eurToGhsRate: eurToGhs ? DecimalMath.formatRate(eurToGhs.rate) : null,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : new Date(entity.createdAt || Date.now()).toISOString(),
      createdBy: entity.createdBy,
    };
  }
}

export class ExchangeRateSheetDetailDto extends ExchangeRateSheetSummaryDto {
  @ApiProperty({
    description: 'List of exchange rate entries',
    type: [ExchangeRateEntryResponseDto],
  })
  entries: ExchangeRateEntryResponseDto[];

  static fromEntityWithEntries(
    entity: ExchangeRateSheet & { entries: ExchangeRateEntry[] },
  ): ExchangeRateSheetDetailDto {
    return {
      ...ExchangeRateSheetSummaryDto.fromEntity(entity),
      entries: (entity.entries || []).map((e) =>
        ExchangeRateEntryResponseDto.fromEntity(e),
      ),
    };
  }
}
