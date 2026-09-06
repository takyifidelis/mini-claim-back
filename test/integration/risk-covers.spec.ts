import { describe, it, expect, beforeEach } from 'vitest';
import { RiskCoversService } from '../../src/modules/risk-covers/risk-covers.service.js';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('RiskCoversService (Integration)', () => {
  let service: RiskCoversService;
  let mockPrisma: any;
  let mockActorProvider: any;
  let storage: any[];

  beforeEach(() => {
    storage = [];
    mockPrisma = {
      riskCover: {
        findUnique: async ({ where }: any) => {
          if (where.id) return storage.find((r) => r.id === where.id) || null;
          if (where.code) return storage.find((r) => r.code === where.code) || null;
          return null;
        },
        create: async ({ data }: any) => {
          const record = {
            id: `uuid-${storage.length + 1}`,
            ...data,
            createdAt: new Date(),
          };
          storage.push(record);
          return record;
        },
        count: async () => storage.length,
        findMany: async ({ where }: any = {}) =>
          where?.status ? storage.filter((record) => record.status === where.status) : storage,
      },
    };

    mockActorProvider = {
      getActor: () => 'test_actor',
    };

    service = new RiskCoversService(mockPrisma as any, mockActorProvider as any);
  });

  it('creates risk cover with uppercase trimmed code and default status', async () => {
    const res = await service.create({
      code: 'ACC_DAMAGE',
      name: 'Accidental Damage',
      description: 'Covers physical damages',
    });

    expect(res.code).toBe('ACC_DAMAGE');
    expect(res.status).toBe('ACTIVE');
    expect(res.createdBy).toBe('test_actor');
  });

  it('rejects duplicate risk cover code with ConflictException', async () => {
    await service.create({
      code: 'FIRE',
      name: 'Fire Cover',
      description: 'Fire damage',
    });

    await expect(
      service.create({
        code: 'FIRE',
        name: 'Duplicate Fire',
        description: 'Duplicate',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('retrieves single risk cover by UUID or throws NotFoundException', async () => {
    const created = await service.create({
      code: 'THEFT',
      name: 'Theft Cover',
      description: 'Theft loss',
    });

    const found = await service.findOne(created.id);
    expect(found.code).toBe('THEFT');

    await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
  });

  it('returns every active risk cover for selectors without list pagination', async () => {
    await service.create({ code: 'ACTIVE', name: 'Active', description: 'Available' });
    await service.create({
      code: 'INACTIVE',
      name: 'Inactive',
      description: 'Unavailable',
      status: 'INACTIVE',
    });

    const options = await service.findOptions();

    expect(options.map((option) => option.code)).toEqual(['ACTIVE']);
  });
});
