import { describe, it, expect, beforeEach } from 'vitest';
import { ExchangeRateSheetsService } from '../../src/modules/exchange-rate-sheets/exchange-rate-sheets.service.js';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('ExchangeRateSheetsService (Integration)', () => {
  let service: ExchangeRateSheetsService;
  let mockPrisma: any;
  let mockActorProvider: any;
  let sheetsStorage: any[];

  beforeEach(() => {
    sheetsStorage = [];
    mockPrisma = {
      getNextFxSheetReference: async () => `FX-20260905-00000${sheetsStorage.length + 1}`,
      $transaction: async (cb: any) => cb(mockPrisma),
      exchangeRateSheet: {
        findUnique: async ({ where }: any) => {
          if (where.id) return sheetsStorage.find((s) => s.id === where.id) || null;
          if (where.effectiveAt) {
            return sheetsStorage.find((s) => s.effectiveAt.getTime() === where.effectiveAt.getTime()) || null;
          }
          return null;
        },
        create: async ({ data }: any) => {
          const record = {
            id: `sheet-${sheetsStorage.length + 1}`,
            reference: data.reference,
            effectiveAt: data.effectiveAt,
            notes: data.notes,
            createdBy: data.createdBy,
            createdAt: new Date(),
            entries: (data.entries?.create || []).map((e: any, idx: number) => ({
              id: `entry-${sheetsStorage.length + 1}-${idx + 1}`,
              exchangeRateSheetId: `sheet-${sheetsStorage.length + 1}`,
              ...e,
            })),
          };
          sheetsStorage.push(record);
          return record;
        },
        findFirst: async ({ where }: any) => {
          const lteTime = where.effectiveAt?.lte ? new Date(where.effectiveAt.lte).getTime() : Date.now();
          const valid = sheetsStorage.filter((s) => s.effectiveAt.getTime() <= lteTime);
          valid.sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime());
          return valid[0] || null;
        },
        count: async () => sheetsStorage.length,
        findMany: async () => sheetsStorage,
      },
    };

    mockActorProvider = {
      getActor: () => 'rate_publisher',
    };

    service = new ExchangeRateSheetsService(mockPrisma as any, mockActorProvider as any);
  });

  const validBaseRates = {
    usdToGhsRate: '12.5000',
    eurToGhsRate: '13.3333',
  };

  it('creates an immutable rate sheet with all 6 directed pairs and generates FX reference', async () => {
    const res = await service.create({
      effectiveAt: '2026-01-01T00:00:00.000Z',
      notes: 'Initial Rates',
      ...validBaseRates,
    });

    expect(res.reference).toMatch(/^FX-20260905-\d{6}$/);
    expect(res.entries.length).toBe(6);
    expect(res.entries.find((entry) => entry.fromCurrency === 'GHS' && entry.toCurrency === 'USD')?.rate)
      .toBe('0.0800');
    expect(res.entries.find((entry) => entry.fromCurrency === 'USD' && entry.toCurrency === 'GHS')?.rate)
      .toBe('12.5000');
  });

  it('rejects invalid canonical base rates', async () => {
    await expect(
      service.create({
        effectiveAt: '2026-02-01T00:00:00.000Z',
        usdToGhsRate: '0',
        eurToGhsRate: '13.3333',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('includes the USD and EUR equivalents in GHS in list summaries', async () => {
    await service.create({
      effectiveAt: '2026-01-01T00:00:00.000Z',
      notes: 'List rates',
      ...validBaseRates,
    });

    const result = await service.findAll({ page: 1, pageSize: 10 });

    expect(result.items[0].usdToGhsRate).toBe('12.5000');
    expect(result.items[0].eurToGhsRate).toBe('13.3333');
  });

  it('rejects duplicate effectiveAt timestamp with ConflictException', async () => {
    await service.create({
      effectiveAt: '2026-01-01T00:00:00.000Z',
      ...validBaseRates,
    });

    await expect(
      service.create({
        effectiveAt: '2026-01-01T00:00:00.000Z',
        ...validBaseRates,
      })
    ).rejects.toThrow(ConflictException);
  });

  it('correctly determines current active sheet (greatest effectiveAt <= now)', async () => {
    await service.create({
      effectiveAt: '2026-01-01T00:00:00.000Z',
      notes: 'Historical 1',
      ...validBaseRates,
    });

    await service.create({
      effectiveAt: '2026-06-01T00:00:00.000Z',
      notes: 'Historical 2',
      ...validBaseRates,
    });

    // Future-dated sheet (not active yet)
    await service.create({
      effectiveAt: '2099-01-01T00:00:00.000Z',
      notes: 'Future Rates',
      ...validBaseRates,
    });

    const active = await service.getCurrentSheet(new Date('2026-07-01T00:00:00.000Z'));
    expect(active.notes).toBe('Historical 2');
  });
});
