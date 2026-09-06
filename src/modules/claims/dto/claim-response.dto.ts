import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, ReviewDecision, Claim, ClaimReview, Policy, PolicyRiskCover, ClaimPayment } from '@prisma/client';
import { DecimalMath } from '../../../common/utils/decimal.util.js';
import { DerivedClaimStatus } from './query-claims.dto.js';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto.js';

export class ClaimReviewResponseDto {
  @ApiProperty({ description: 'UUID primary key' })
  id: string;

  @ApiProperty({ description: 'Review decision', enum: ReviewDecision })
  decision: ReviewDecision;

  @ApiProperty({ description: 'Explanation reason' })
  reason: string;

  @ApiProperty({ description: 'Review timestamp' })
  reviewedAt: string;

  @ApiProperty({ description: 'Actor who reviewed the claim' })
  reviewedBy: string;

  static fromEntity(entity: ClaimReview): ClaimReviewResponseDto {
    return {
      id: entity.id,
      decision: entity.decision,
      reason: entity.reason,
      reviewedAt: entity.reviewedAt.toISOString(),
      reviewedBy: entity.reviewedBy,
    };
  }
}

export class CurrencyTotalsDto {
  @ApiProperty({ description: 'Claim currency', enum: Currency, example: Currency.USD })
  currency: Currency;

  @ApiProperty({ description: 'Total estimated loss for filtered claims', example: '150000.00' })
  totalEstimatedLoss: string;

  @ApiProperty({ description: 'Total approved payout for filtered claims', example: '120000.00' })
  totalApprovedPayout: string;

  @ApiProperty({ description: 'Total paid across all filtered claims', example: '95000.00' })
  totalPaid: string;

  @ApiProperty({ description: 'Signed outstanding balance (can be negative if overpaid)', example: '25000.00' })
  signedOutstandingBalance: string;

  @ApiProperty({ description: 'Number of claims without approved payout in this currency', example: 3 })
  unapprovedCount: number;

  @ApiProperty({ description: 'Total count of claims in this currency', example: 12 })
  totalClaims: number;
}

export class ClaimSummaryDto {
  @ApiProperty({ description: 'UUID primary key' })
  id: string;

  @ApiProperty({ description: 'Sequential claim reference', example: 'CLM-2026-000001' })
  claimReference: string;

  @ApiProperty({ description: 'Policy UUID' })
  policyId: string;

  @ApiProperty({ description: 'Policy number (from policy relation)', example: 'POL-2026-000001' })
  policyNumber: string;

  @ApiProperty({ description: 'Insured name (from policy relation)', example: 'Acme Logistics Ltd' })
  insuredName: string;

  @ApiProperty({ description: 'Policy risk cover UUID' })
  policyRiskCoverId: string;

  @ApiProperty({ description: 'Cover code snapshot', example: 'ACC_DAMAGE' })
  coverCodeSnapshot: string;

  @ApiProperty({ description: 'Cover name snapshot', example: 'Accidental Damage' })
  coverNameSnapshot: string;

  @ApiProperty({ description: 'Claim settlement currency', enum: Currency, example: Currency.USD })
  currency: Currency;

  @ApiProperty({ description: 'Loss date (YYYY-MM-DD)', example: '2026-03-15' })
  lossDate: string;

  @ApiProperty({ description: 'Date notified (YYYY-MM-DD)', example: '2026-03-16' })
  dateNotified: string;

  @ApiProperty({ description: 'Nature and details of loss' })
  lossNature: string;

  @ApiProperty({ description: 'Estimated loss amount in claim currency', example: '15000.00' })
  estimatedLossAmount: string;

  @ApiPropertyOptional({ description: 'Approved payout amount in claim currency', example: '12000.00' })
  approvedPayoutAmount: string | null;

  @ApiProperty({ description: 'Total paid in claim currency', example: '5000.00' })
  totalPaid: string;

  @ApiPropertyOptional({ description: 'Outstanding balance (null if payout is null)', example: '7000.00' })
  outstandingBalance: string | null;

  @ApiPropertyOptional({ description: 'Overpaid amount (if balance is negative)', example: '0.00' })
  overpaidAmount: string | null;

  @ApiProperty({ description: 'Derived claim lifecycle status', enum: DerivedClaimStatus, example: DerivedClaimStatus.PAYMENT_OUTSTANDING })
  status: DerivedClaimStatus;

  @ApiProperty({ description: 'Optimistic concurrency version', example: 1 })
  version: number;

  @ApiProperty({ description: 'UTC creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'UTC updated timestamp' })
  updatedAt: string;

  @ApiProperty({ description: 'Server-derived actor' })
  createdBy: string;

  @ApiPropertyOptional({ description: 'Review summary if reviewed', type: ClaimReviewResponseDto })
  review?: ClaimReviewResponseDto | null;

  static deriveStatus(
    review: ClaimReview | null | undefined,
    approvedPayoutAmount: any,
    outstandingBalance: any
  ): DerivedClaimStatus {
    if (!review) {
      return DerivedClaimStatus.UNDER_REVIEW;
    }
    if (review.decision === 'DENIED') {
      return DerivedClaimStatus.DENIED;
    }
    if (approvedPayoutAmount === null || approvedPayoutAmount === undefined) {
      return DerivedClaimStatus.RESERVED_NOT_SETTLED;
    }
    if (outstandingBalance !== null && outstandingBalance !== undefined) {
      if (DecimalMath.isGreaterThan(outstandingBalance, 0)) {
        return DerivedClaimStatus.PAYMENT_OUTSTANDING;
      }
      return DerivedClaimStatus.PAID;
    }
    return DerivedClaimStatus.RESERVED_NOT_SETTLED;
  }

  static fromEntityWithRelations(
    claim: Claim & {
      policy: Policy;
      policyRiskCover: PolicyRiskCover;
      review?: ClaimReview | null;
      payments?: ClaimPayment[];
    }
  ): ClaimSummaryDto {
    const totalPaidDec = (claim.payments || []).reduce(
      (sum, p) => DecimalMath.add(sum, p.amountInClaimCurrency),
      DecimalMath.from(0)
    );
    const totalPaidStr = DecimalMath.formatMoney(totalPaidDec);

    let outstandingBalanceStr: string | null = null;
    let overpaidAmountStr: string | null = null;

    if (claim.approvedPayoutAmount !== null && claim.approvedPayoutAmount !== undefined) {
      const balanceDec = DecimalMath.sub(claim.approvedPayoutAmount, totalPaidDec);
      outstandingBalanceStr = DecimalMath.formatMoney(balanceDec);

      if (DecimalMath.isNegative(balanceDec)) {
        overpaidAmountStr = DecimalMath.formatMoney(DecimalMath.abs(balanceDec));
      } else {
        overpaidAmountStr = '0.00';
      }
    }

    const status = ClaimSummaryDto.deriveStatus(
      claim.review,
      claim.approvedPayoutAmount,
      outstandingBalanceStr
    );

    return {
      id: claim.id,
      claimReference: claim.claimReference,
      policyId: claim.policyId,
      policyNumber: claim.policy.policyNumber,
      insuredName: claim.policy.insuredName,
      policyRiskCoverId: claim.policyRiskCoverId,
      coverCodeSnapshot: claim.policyRiskCover.coverCodeSnapshot,
      coverNameSnapshot: claim.policyRiskCover.coverNameSnapshot,
      currency: claim.currency,
      lossDate: claim.lossDate.toISOString().substring(0, 10),
      dateNotified: claim.dateNotified.toISOString().substring(0, 10),
      lossNature: claim.lossNature,
      estimatedLossAmount: DecimalMath.formatMoney(claim.estimatedLossAmount),
      approvedPayoutAmount: DecimalMath.formatNullableMoney(claim.approvedPayoutAmount),
      totalPaid: totalPaidStr,
      outstandingBalance: outstandingBalanceStr,
      overpaidAmount: overpaidAmountStr,
      status,
      version: claim.version,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      createdBy: claim.createdBy,
      review: claim.review ? ClaimReviewResponseDto.fromEntity(claim.review) : null,
    };
  }
}

export class ClaimDetailDto extends ClaimSummaryDto {
  @ApiProperty({ description: 'Coverage limit on the policy cover', example: '50000.00' })
  coverageLimit: string;

  @ApiProperty({ description: 'Deductible amount on the policy cover', example: '500.00' })
  deductibleAmount: string;

  @ApiPropertyOptional({ description: 'Policy cover specific terms' })
  coverTerms?: string | null;

  static fromEntityWithDetails(
    claim: Claim & {
      policy: Policy;
      policyRiskCover: PolicyRiskCover;
      review?: ClaimReview | null;
      payments?: ClaimPayment[];
    }
  ): ClaimDetailDto {
    const summary = ClaimSummaryDto.fromEntityWithRelations(claim);
    return {
      ...summary,
      coverageLimit: DecimalMath.formatMoney(claim.policyRiskCover.coverageLimit),
      deductibleAmount: DecimalMath.formatMoney(claim.policyRiskCover.deductibleAmount),
      coverTerms: claim.policyRiskCover.terms,
    };
  }
}

export class PaginatedClaimsResponseDto extends PaginatedResponseDto<ClaimSummaryDto> {
  @ApiProperty({ description: 'Grouped totals by claim currency calculated over full filtered dataset', type: [CurrencyTotalsDto] })
  totalsByCurrency: CurrencyTotalsDto[];

  constructor(
    items: ClaimSummaryDto[],
    totalItems: number,
    page: number,
    pageSize: number,
    totalsByCurrency: CurrencyTotalsDto[]
  ) {
    super(items, totalItems, page, pageSize);
    this.totalsByCurrency = totalsByCurrency;
  }
}
