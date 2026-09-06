import { describe, it, expect, beforeEach } from 'vitest';
import { PoliciesService } from '../../src/modules/policies/policies.service.js';
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { Currency } from '@prisma/client';

describe('PoliciesService (Integration)', () => {
  let service: PoliciesService;
  let mockPrisma: any;
  let mockActorProvider: any;
  let policies: any[];
  let rateSheets: any[];
  let riskCovers: any[];

  beforeEach(() => {
    policies = [];
    riskCovers = [
      { id: 'rc-1', code: 'ACC_DAMAGE', name: 'Accidental Damage', status: 'ACTIVE' },
      { id: 'rc-2', code: 'INACTIVE_COVER', name: 'Old Cover', status: 'INACTIVE' },
    ];
    rateSheets = [
      {
        id: 'sheet-1',
        reference: 'FX-20260101-000001',
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'system',
        entries: [
          { fromCurrency: 'GHS', toCurrency: 'USD', rate: '0.08000000' },
          { fromCurrency: 'EUR', toCurrency: 'USD', rate: '1.06666667' },
        ],
      },
    ];

    mockPrisma = {
      getNextPolicyNumber: async () => `POL-2026-00000${policies.length + 1}`,
      $transaction: async (cb: any) => cb(mockPrisma),
      riskCover: {
        findMany: async ({ where }: any) => {
          const ids = where.id.in;
          return riskCovers.filter((c) => ids.includes(c.id));
        },
      },
      exchangeRateSheet: {
        findFirst: async () => rateSheets[0],
      },
      policy: {
        create: async ({ data }: any) => {
          const pol = {
            id: `pol-${policies.length + 1}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            policyRiskCovers: (data.policyRiskCovers?.create || []).map((c: any, idx: number) => ({
              id: `pc-${policies.length + 1}-${idx + 1}`,
              policyId: `pol-${policies.length + 1}`,
              ...c,
              createdAt: new Date(),
            })),
            exchangeRateSheet: rateSheets[0],
          };
          policies.push(pol);
          return pol;
        },
        findUnique: async ({ where }: any) => {
          return policies.find((p) => p.id === where.id) || null;
        },
        count: async () => policies.length,
        findMany: async () => policies,
      },
    };

    mockActorProvider = {
      getActor: () => 'underwriter',
    };

    service = new PoliciesService(mockPrisma as any, mockActorProvider as any);
  });

  it('creates policy, assigns covers, locks active exchange rate sheet transactionally', async () => {
    const res = await service.create({
      insuredName: 'Golden Logistics',
      policyType: 'Commercial Transit',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      currency: Currency.USD,
      sumInsured: '1000000.00',
      covers: [
        {
          riskCoverId: 'rc-1',
          coverageLimit: '500000.00',
          deductibleAmount: '10000.00',
          terms: 'Vehicle overturn only',
        },
      ],
    });

    expect(res.policyNumber).toBe('POL-2026-000001');
    expect(res.exchangeRateSheetId).toBe('sheet-1');
    expect(res.covers.length).toBe(1);
    expect(res.covers[0].coverCodeSnapshot).toBe('ACC_DAMAGE');
    expect(res.covers[0].coverageLimit).toBe('500000.00');
    expect(res.covers[0].deductibleAmount).toBe('10000.00');
  });

  it('rejects policy creation with inactive risk covers', async () => {
    await expect(
      service.create({
        insuredName: 'Golden Logistics',
        policyType: 'Commercial Transit',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: Currency.USD,
        sumInsured: '1000000.00',
        covers: [{ riskCoverId: 'rc-2', coverageLimit: '100000.00' }], // Inactive
      })
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rejects policy creation when deductible exceeds coverage limit', async () => {
    await expect(
      service.create({
        insuredName: 'Golden Logistics',
        policyType: 'Commercial Transit',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: Currency.USD,
        sumInsured: '1000000.00',
        covers: [
          {
            riskCoverId: 'rc-1',
            coverageLimit: '50000.00',
            deductibleAmount: '60000.00', // Exceeds limit!
          },
        ],
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('returns every policy for selectors without reusing list pagination', async () => {
    await service.create({
      insuredName: 'Golden Logistics',
      policyType: 'Commercial Transit',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      currency: Currency.USD,
      sumInsured: '1000000.00',
      covers: [{ riskCoverId: 'rc-1', coverageLimit: '500000.00' }],
    });

    const options = await service.findOptions();

    expect(options).toHaveLength(1);
    expect(options[0].policyNumber).toBe('POL-2026-000001');
  });
});
