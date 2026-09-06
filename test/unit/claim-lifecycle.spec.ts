import { describe, it, expect } from 'vitest';
import { ClaimSummaryDto } from '../../src/modules/claims/dto/claim-response.dto.js';
import { DerivedClaimStatus } from '../../src/modules/claims/dto/query-claims.dto.js';
import { ReviewDecision } from '@prisma/client';

describe('Claim Lifecycle Status Derivation', () => {
  it('derives UNDER_REVIEW when claim has no review record', () => {
    const status = ClaimSummaryDto.deriveStatus(null, null, null);
    expect(status).toBe(DerivedClaimStatus.UNDER_REVIEW);
  });

  it('derives DENIED when review decision is DENIED', () => {
    const review = { id: 'rev-1', claimId: 'c-1', decision: ReviewDecision.DENIED, reason: 'Invalid', reviewedAt: new Date(), reviewedBy: 'adj' };
    const status = ClaimSummaryDto.deriveStatus(review, null, null);
    expect(status).toBe(DerivedClaimStatus.DENIED);
  });

  it('derives RESERVED_NOT_SETTLED when review is APPROVED but payout is null', () => {
    const review = { id: 'rev-1', claimId: 'c-1', decision: ReviewDecision.APPROVED, reason: 'Valid', reviewedAt: new Date(), reviewedBy: 'adj' };
    const status = ClaimSummaryDto.deriveStatus(review, null, null);
    expect(status).toBe(DerivedClaimStatus.RESERVED_NOT_SETTLED);
  });

  it('derives PAYMENT_OUTSTANDING when review is APPROVED, payout is set, and balance > 0', () => {
    const review = { id: 'rev-1', claimId: 'c-1', decision: ReviewDecision.APPROVED, reason: 'Valid', reviewedAt: new Date(), reviewedBy: 'adj' };
    const status = ClaimSummaryDto.deriveStatus(review, '10000.00', '4000.00');
    expect(status).toBe(DerivedClaimStatus.PAYMENT_OUTSTANDING);
  });

  it('derives PAID when review is APPROVED, payout is set, and balance is 0.00 (fully paid)', () => {
    const review = { id: 'rev-1', claimId: 'c-1', decision: ReviewDecision.APPROVED, reason: 'Valid', reviewedAt: new Date(), reviewedBy: 'adj' };
    const status = ClaimSummaryDto.deriveStatus(review, '10000.00', '0.00');
    expect(status).toBe(DerivedClaimStatus.PAID);
  });

  it('derives PAID when review is APPROVED, payout is explicitly 0.00, and balance is 0.00', () => {
    const review = { id: 'rev-1', claimId: 'c-1', decision: ReviewDecision.APPROVED, reason: 'Valid deductible absorption', reviewedAt: new Date(), reviewedBy: 'adj' };
    const status = ClaimSummaryDto.deriveStatus(review, '0.00', '0.00');
    expect(status).toBe(DerivedClaimStatus.PAID);
  });

  it('derives PAID when review is APPROVED, payout is set, and balance is negative (overpaid)', () => {
    const review = { id: 'rev-1', claimId: 'c-1', decision: ReviewDecision.APPROVED, reason: 'Valid', reviewedAt: new Date(), reviewedBy: 'adj' };
    const status = ClaimSummaryDto.deriveStatus(review, '10000.00', '-2000.00');
    expect(status).toBe(DerivedClaimStatus.PAID);
  });
});
