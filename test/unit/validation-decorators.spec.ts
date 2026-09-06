import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { IsUUID } from '../../src/common/decorators/is-uuid.decorator.js';
import { IsMoneyString } from '../../src/common/decorators/is-money-string.decorator.js';
import { IsRateString } from '../../src/common/decorators/is-rate-string.decorator.js';

class TestDto {
  @IsUUID()
  uuid: string;

  @IsMoneyString({ allowZero: true })
  money: string;

  @IsRateString()
  rate: string;
}

describe('Validation Decorators', () => {
  it('accepts valid RFC 4122 UUIDs and deterministic sequential UUIDs', async () => {
    const dto = new TestDto();
    dto.uuid = '10000000-0000-0000-0000-000000000001';
    dto.money = '100.00';
    dto.rate = '1.0000';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('accepts standard RFC 4122 v4 UUIDs', async () => {
    const dto = new TestDto();
    dto.uuid = 'a8f8ffe7-b753-41d0-ad51-308cc7283f8b';
    dto.money = '100.00';
    dto.rate = '1.0000';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects malformed UUID strings', async () => {
    const dto = new TestDto();
    dto.uuid = 'invalid-uuid-string';
    dto.money = '100.00';
    dto.rate = '1.0000';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('uuid');
  });
});
