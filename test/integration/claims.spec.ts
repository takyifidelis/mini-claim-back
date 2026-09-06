import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimsService } from '../../src/modules/claims/claims.service.js';
import {
  BadRequestException,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { Currency, ReviewDecision } from '@prisma/client';

describe('ClaimsService (Integration)', () => {
  let service: ClaimsService;
  let mockPrisma: any;
  let mockActorProvider: any;
  let claims: any[];
  let policy: any;

  beforeEach(() => {
    claims = [];
    policy = {
      id: 'pol-1',
      policyNumber: 'POL-2026-000001',
      insuredName: 'Apex Haulage',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      currency: Currency.USD,
      policyRiskCovers: [
        {
          id: 'pc-1',
          policyId: 'pol-1',
          coverageLimit: '100000.00',
          deductibleAmount: '5000.00',
          coverCodeSnapshot: 'ACC_DAMAGE',
          coverNameSnapshot: 'Accidental Damage',
        },
      ],
    };

    mockPrisma = {
      getNextClaimReference: async () => `CLM-2026-00000${claims.length + 1}`,
      $transaction: async (cb: any) => cb(mockPrisma),
      policy: {
        findUnique: async () => policy,
      },
      claim: {
        create: async ({ data }: any) => {
          const claim = {
            id: `claim-${claims.length + 1}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            policy,
            policyRiskCover: policy.policyRiskCovers[0],
            review: null,
            payments: [],
          };
          claims.push(claim);
          return claim;
        },
        findUnique: async ({ where }: any) => {
          return claims.find((c) => c.id === where.id) || null;
        },
        findUniqueOrThrow: async ({ where }: any) => {
          const c = claims.find((c) => c.id === where.id);
          if (!c) throw new Error(`Claim with ID ${where.id} not found.`);
          return c;
        },
        update: async ({ where, data }: any) => {
          const idx = claims.findIndex((c) => c.id === where.id);
          if (idx === -1) return null;
          claims[idx] = {
            ...claims[idx],
            ...data,
            updatedAt: new Date(),
          };
          return claims[idx];
        },
        updateMany: async ({ where, data }: any) => {
          const matching = claims.filter((c) => {
            if (where.id && c.id !== where.id) return false;
            if (where.version !== undefined && c.version !== where.version) return false;
            return true;
          });
          for (const c of matching) {
            Object.assign(c, data, { updatedAt: new Date() });
          }
          return { count: matching.length };
        },
        findMany: async () => claims,
      },
      claimReview: {
        create: async ({ data }: any) => {
          const claim = claims.find((c) => c.id === data.claimId);
          if (claim) {
            claim.review = {
              id: `rev-${claim.id}`,
              ...data,
              reviewedAt: new Date(),
            };
          }
          return claim?.review;
        },
      },
    };

    mockActorProvider = {
      getActor: () => 'claims_adjuster',
    };

    service = new ClaimsService(mockPrisma as any, mockActorProvider as any);
  });

  it('creates a claim under review and rejects loss dates outside policy period', async () => {
    const claim = await service.create({
      policyId: 'pol-1',
      policyRiskCoverId: 'pc-1',
      lossDate: '2026-05-10',
      dateNotified: '2026-05-12',
      lossNature: 'Overturned trailer',
      estimatedLossAmount: '40000.00',
    });

    expect(claim.claimReference).toBe('CLM-2026-000001');
    expect(claim.status).toBe('UNDER_REVIEW');
    expect(claim.currency).toBe(Currency.USD);
    expect(claim.version).toBe(1);

    // Reject loss date outside policy coverage window
    await expect(
      service.create({
        policyId: 'pol-1',
        policyRiskCoverId: 'pc-1',
        lossDate: '2025-11-20', // Outside
        dateNotified: '2026-01-10',
        lossNature: 'Old event',
        estimatedLossAmount: '10000.00',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('allows eligibility edits while under review but rejects after review', async () => {
    const claim = await service.create({
      policyId: 'pol-1',
      policyRiskCoverId: 'pc-1',
      lossDate: '2026-05-10',
      dateNotified: '2026-05-12',
      lossNature: 'Original description',
      estimatedLossAmount: '40000.00',
    });

    const updated = await service.update(claim.id, {
      expectedVersion: 1,
      lossNature: 'Updated description with additional details',
      estimatedLossAmount: '45000.00',
    });
    expect(updated.estimatedLossAmount).toBe('45000.00');
    expect(updated.version).toBe(2);

    await expect(
      service.update(claim.id, {
        expectedVersion: 1,
        lossNature: 'Stale edit',
      })
    ).rejects.toThrow(HttpException);

    await expect(
      service.createReview(claim.id, {
        expectedVersion: 1,
        decision: ReviewDecision.APPROVED,
        reason: 'Stale review',
      })
    ).rejects.toThrow(HttpException);

    // Approve review
    await service.createReview(claim.id, {
      expectedVersion: 2,
      decision: ReviewDecision.APPROVED,
      reason: 'Damage verified',
    });

    // Attempting edit after review throws UnprocessableEntityException
    await expect(
      service.update(claim.id, {
        expectedVersion: 3,
        estimatedLossAmount: '50000.00',
      })
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('manages approved payout with coverage limit enforcement and version increments', async () => {
    const claim = await service.create({
      policyId: 'pol-1',
      policyRiskCoverId: 'pc-1',
      lossDate: '2026-05-10',
      dateNotified: '2026-05-12',
      lossNature: 'Trailer damage',
      estimatedLossAmount: '40000.00',
    });

    await service.createReview(claim.id, {
      expectedVersion: 1,
      decision: ReviewDecision.APPROVED,
      reason: 'Verified',
    });

    // Payout exceeding coverage limit (100,000) is rejected
    await expect(
      service.setApprovedPayout(claim.id, {
        approvedPayoutAmount: '120000.00',
        expectedVersion: 2,
      })
    ).rejects.toThrow(UnprocessableEntityException);

    // Valid payout setting
    const withPayout = await service.setApprovedPayout(claim.id, {
      approvedPayoutAmount: '35000.00',
      expectedVersion: 2,
    });
    expect(withPayout.approvedPayoutAmount).toBe('35000.00');
    expect(withPayout.status).toBe('PAYMENT_OUTSTANDING');
    expect(withPayout.version).toBe(3);

    // Stale version conflict throws HttpException 409
    await expect(
      service.setApprovedPayout(claim.id, {
        approvedPayoutAmount: '30000.00',
        expectedVersion: 2, // Stale!
      })
    ).rejects.toThrow(HttpException);
  });
});
