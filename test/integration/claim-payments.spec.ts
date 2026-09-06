import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimPaymentsService } from '../../src/modules/claim-payments/claim-payments.service.js';
import { HttpException } from '@nestjs/common';
import { Currency, ReviewDecision } from '@prisma/client';

describe('ClaimPaymentsService (Integration)', () => {
  let service: ClaimPaymentsService;
  let mockPrisma: any;
  let mockActorProvider: any;
  let claim: any;
  let payments: any[];

  beforeEach(() => {
    payments = [];
    claim = {
      id: 'claim-1',
      claimReference: 'CLM-2026-000001',
      currency: Currency.USD,
      approvedPayoutAmount: '30000.00',
      version: 1,
      policy: {
        id: 'pol-1',
        currency: Currency.USD,
        exchangeRateSheet: {
          id: 'sheet-1',
          reference: 'FX-20260101-000001',
          entries: [
            { id: 'ent-1', fromCurrency: Currency.GHS, toCurrency: Currency.USD, rate: '0.0800' },
            { id: 'ent-2', fromCurrency: Currency.EUR, toCurrency: Currency.USD, rate: '1.0667' },
          ],
        },
      },
      review: {
        id: 'rev-1',
        decision: ReviewDecision.APPROVED,
        reason: 'Valid claim',
      },
      payments,
    };

    mockPrisma = {
      $transaction: async (cb: any) => cb(mockPrisma),
      claim: {
        findUnique: async () => claim,
        update: async ({ data }: any) => {
          claim = { ...claim, ...data, updatedAt: new Date() };
          return claim;
        },
        updateMany: async ({ where, data }: any) => {
          if (where.id && claim.id !== where.id) return { count: 0 };
          if (where.version !== undefined && claim.version !== where.version) return { count: 0 };
          claim = { ...claim, ...data, updatedAt: new Date() };
          return { count: 1 };
        },
      },
      claimPayment: {
        create: async ({ data }: any) => {
          const pay = {
            id: `pay-${payments.length + 1}`,
            ...data,
            createdAt: new Date(),
          };
          payments.push(pay);
          claim.payments = payments;
          return pay;
        },
        count: async () => payments.length,
        findMany: async () => payments,
      },
    };

    mockActorProvider = {
      getActor: () => 'settlement_officer',
    };

    service = new ClaimPaymentsService(mockPrisma as any, mockActorProvider as any);
  });

  it('records same-currency payment with 1.0000 applied rate and increments claim version', async () => {
    const res = await service.create('claim-1', {
      paymentDate: '2026-04-01',
      amount: '10000.00',
      currency: Currency.USD,
      expectedVersion: 1,
    });

    expect(res.appliedRate).toBe('1.0000');
    expect(res.amountInClaimCurrency).toBe('10000.00');
    expect(claim.version).toBe(2);
  });

  it('records cross-currency payment using policy locked rates (GHS->USD)', async () => {
    // 125,000 GHS * 0.08 = 10,000.00 USD
    const res = await service.create('claim-1', {
      paymentDate: '2026-04-05',
      amount: '125000.00',
      currency: Currency.GHS,
      expectedVersion: 1,
    });

    expect(res.appliedRate).toBe('0.0800');
    expect(res.amountInClaimCurrency).toBe('10000.00');
    expect(claim.version).toBe(2);
  });

  it('enforces overpayment confirmation protocol when payment exceeds remaining payout', async () => {
    // First payment: 25,000.00 USD (version 1 -> 2, balance remains 5,000.00)
    await service.create('claim-1', {
      paymentDate: '2026-04-01',
      amount: '25000.00',
      currency: Currency.USD,
      expectedVersion: 1,
    });

    // Second payment of 10,000.00 USD would produce negative balance -5,000.00
    try {
      await service.create('claim-1', {
        paymentDate: '2026-04-10',
        amount: '10000.00',
        currency: Currency.USD,
        expectedVersion: 2,
        confirmOverpayment: false,
      });
      expect.fail('Should have thrown OVERPAYMENT_CONFIRMATION_REQUIRED');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      const res = err.getResponse();
      expect(res.code).toBe('OVERPAYMENT_CONFIRMATION_REQUIRED');
      expect(res.details.proposedSignedBalance).toBe('-5000.00');
      expect(res.details.absoluteOverpayment).toBe('5000.00');
    }

    // Now confirm overpayment with confirmOverpayment: true
    const confirmed = await service.create('claim-1', {
      paymentDate: '2026-04-10',
      amount: '10000.00',
      currency: Currency.USD,
      expectedVersion: 2,
      confirmOverpayment: true,
    });
    expect(confirmed.amountInClaimCurrency).toBe('10000.00');
    expect(claim.version).toBe(3);
  });

  it('rejects payment with stale version with CLAIM_VERSION_CONFLICT', async () => {
    await expect(
      service.create('claim-1', {
        paymentDate: '2026-04-01',
        amount: '5000.00',
        currency: Currency.USD,
        expectedVersion: 99, // Stale!
      })
    ).rejects.toThrow(HttpException);
  });
});
