import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PolicyStatus, Policy, PolicyRiskCover, ExchangeRateSheet } from '@prisma/client';
import { DecimalMath } from '../../../common/utils/decimal.util.js';
import { ExchangeRateSheetSummaryDto } from '../../exchange-rate-sheets/dto/exchange-rate-sheet-response.dto.js';

export class PolicyRiskCoverResponseDto {
  @ApiProperty({ description: 'UUID primary key' })
  id: string;

  @ApiProperty({ description: 'Policy UUID foreign key' })
  policyId: string;

  @ApiProperty({ description: 'Risk cover catalogue UUID foreign key' })
  riskCoverId: string;

  @ApiProperty({ description: 'Snapshot of cover code at issue time', example: 'ACC_DAMAGE' })
  coverCodeSnapshot: string;

  @ApiProperty({ description: 'Snapshot of cover name at issue time', example: 'Accidental Damage' })
  coverNameSnapshot: string;

  @ApiProperty({ description: 'Coverage limit in policy currency', example: '50000.00' })
  coverageLimit: string;

  @ApiProperty({ description: 'Deductible amount in policy currency', example: '500.00' })
  deductibleAmount: string;

  @ApiPropertyOptional({ description: 'Policy specific terms' })
  terms: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Server actor who created the assignment' })
  createdBy: string;

  static fromEntity(entity: PolicyRiskCover): PolicyRiskCoverResponseDto {
    return {
      id: entity.id,
      policyId: entity.policyId,
      riskCoverId: entity.riskCoverId,
      coverCodeSnapshot: entity.coverCodeSnapshot,
      coverNameSnapshot: entity.coverNameSnapshot,
      coverageLimit: DecimalMath.formatMoney(entity.coverageLimit),
      deductibleAmount: DecimalMath.formatMoney(entity.deductibleAmount),
      terms: entity.terms,
      createdAt: entity.createdAt.toISOString(),
      createdBy: entity.createdBy,
    };
  }
}

export class PolicySummaryDto {
  @ApiProperty({ description: 'UUID primary key' })
  id: string;

  @ApiProperty({ description: 'Sequential policy reference', example: 'POL-2026-000001' })
  policyNumber: string;

  @ApiProperty({ description: 'Insured name', example: 'Acme Logistics Ltd' })
  insuredName: string;

  @ApiProperty({ description: 'Policy type', example: 'Commercial Property' })
  policyType: string;

  @ApiProperty({ description: 'Start date of coverage (YYYY-MM-DD)', example: '2026-01-01' })
  startDate: string;

  @ApiProperty({ description: 'End date of coverage (YYYY-MM-DD)', example: '2026-12-31' })
  endDate: string;

  @ApiProperty({ description: 'Policy currency', enum: Currency, example: Currency.USD })
  currency: Currency;

  @ApiPropertyOptional({ description: 'Premium amount', example: '2500.00' })
  premiumAmount: string | null;

  @ApiProperty({ description: 'Total sum insured', example: '100000.00' })
  sumInsured: string;

  @ApiProperty({ description: 'Locked exchange rate sheet UUID' })
  exchangeRateSheetId: string;

  @ApiProperty({ description: 'Policy status', enum: PolicyStatus, example: PolicyStatus.ACTIVE })
  status: PolicyStatus;

  @ApiProperty({ description: 'UTC creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'UTC updated timestamp' })
  updatedAt: string;

  @ApiProperty({ description: 'Server-derived actor' })
  createdBy: string;

  static fromEntity(entity: Policy): PolicySummaryDto {
    return {
      id: entity.id,
      policyNumber: entity.policyNumber,
      insuredName: entity.insuredName,
      policyType: entity.policyType,
      startDate: entity.startDate.toISOString().substring(0, 10),
      endDate: entity.endDate.toISOString().substring(0, 10),
      currency: entity.currency,
      premiumAmount: DecimalMath.formatNullableMoney(entity.premiumAmount),
      sumInsured: DecimalMath.formatMoney(entity.sumInsured),
      exchangeRateSheetId: entity.exchangeRateSheetId,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      createdBy: entity.createdBy,
    };
  }
}

export class PolicyDetailDto extends PolicySummaryDto {
  @ApiProperty({ description: 'List of assigned risk covers with snapshots', type: [PolicyRiskCoverResponseDto] })
  covers: PolicyRiskCoverResponseDto[];

  @ApiPropertyOptional({ description: 'Summary of the locked exchange rate sheet', type: ExchangeRateSheetSummaryDto })
  exchangeRateSheet?: ExchangeRateSheetSummaryDto;

  static fromEntityWithRelations(
    entity: Policy & {
      policyRiskCovers: PolicyRiskCover[];
      exchangeRateSheet?: ExchangeRateSheet;
    }
  ): PolicyDetailDto {
    return {
      ...PolicySummaryDto.fromEntity(entity),
      covers: (entity.policyRiskCovers || []).map((c) => PolicyRiskCoverResponseDto.fromEntity(c)),
      exchangeRateSheet: entity.exchangeRateSheet
        ? ExchangeRateSheetSummaryDto.fromEntity(entity.exchangeRateSheet)
        : undefined,
    };
  }
}
