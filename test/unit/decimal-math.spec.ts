import { describe, it, expect } from 'vitest';
import { DecimalMath } from '../../src/common/utils/decimal.util.js';

describe('DecimalMath and Monetary Precision', () => {
  describe('Strict Decimal Arithmetic', () => {
    it('accurately computes 0.10 + 0.20 = 0.30 without floating point error', () => {
      const result = DecimalMath.add('0.10', '0.20');
      expect(result.toString()).toBe('0.3');
      expect(DecimalMath.formatMoney(result)).toBe('0.30');
    });

    it('accurately rounds 1.00 * 1.00500000 = 1.01 with ROUND_HALF_UP', () => {
      const converted = DecimalMath.convert('1.00', '1.00500000');
      expect(DecimalMath.formatMoney(converted)).toBe('1.01');
    });

    it('accurately calculates cross-currency conversion: 8000 * 12.50 = 100000.00', () => {
      const converted = DecimalMath.convert('8000.00', '12.50000000');
      expect(DecimalMath.formatMoney(converted)).toBe('100000.00');
    });

    it('accurately calculates cross-currency conversion: 32000 * 0.9375 = 30000.00', () => {
      const converted = DecimalMath.convert('32000.00', '0.93750000');
      expect(DecimalMath.formatMoney(converted)).toBe('30000.00');
    });

    it('rounds half up at exact midpoints: 1.005 -> 1.01, 1.004 -> 1.00', () => {
      expect(DecimalMath.formatMoney(DecimalMath.from('1.005'))).toBe('1.01');
      expect(DecimalMath.formatMoney(DecimalMath.from('1.004'))).toBe('1.00');
      expect(DecimalMath.formatMoney(DecimalMath.from('1.015'))).toBe('1.02');
      expect(DecimalMath.formatMoney(DecimalMath.from('1.025'))).toBe('1.03');
    });

    it('formats rates with 4 fractional digits (Bank of Ghana standard)', () => {
      expect(DecimalMath.formatRate('1')).toBe('1.0000');
      expect(DecimalMath.formatRate('15.5')).toBe('15.5000');
      expect(DecimalMath.formatRate('0.06666667')).toBe('0.0667');
      expect(DecimalMath.formatRate('15.5412')).toBe('15.5412');
    });

    it('correctly identifies positive, zero, and negative balances', () => {
      expect(DecimalMath.isPositive('100.00')).toBe(true);
      expect(DecimalMath.isPositive('0.00')).toBe(false);
      expect(DecimalMath.isPositive('-10.00')).toBe(false);

      expect(DecimalMath.isZero('0')).toBe(true);
      expect(DecimalMath.isZero('0.00')).toBe(true);
      expect(DecimalMath.isZero('0.01')).toBe(false);

      expect(DecimalMath.isNegative('-50.00')).toBe(true);
      expect(DecimalMath.isNegative('0.00')).toBe(false);
      expect(DecimalMath.isNegative('50.00')).toBe(false);

      expect(DecimalMath.formatMoney(DecimalMath.abs('-50.00'))).toBe('50.00');
    });
  });

  describe('Validation Rules for Money and Rates', () => {
    it('accepts valid money string formats', () => {
      expect(DecimalMath.isValidMoney('0')).toBe(true);
      expect(DecimalMath.isValidMoney('0.00')).toBe(true);
      expect(DecimalMath.isValidMoney('100')).toBe(true);
      expect(DecimalMath.isValidMoney('100.5')).toBe(true);
      expect(DecimalMath.isValidMoney('100.50')).toBe(true);
      expect(DecimalMath.isValidMoney('999999999999999.99')).toBe(true);
    });

    it('rejects invalid money inputs: signs, commas, scientific notation, leading zeros, more than 2 decimals', () => {
      expect(DecimalMath.isValidMoney('-10.00')).toBe(false);
      expect(DecimalMath.isValidMoney('+10.00')).toBe(false);
      expect(DecimalMath.isValidMoney('1,000.00')).toBe(false);
      expect(DecimalMath.isValidMoney('1e5')).toBe(false);
      expect(DecimalMath.isValidMoney('01.50')).toBe(false);
      expect(DecimalMath.isValidMoney('007')).toBe(false);
      expect(DecimalMath.isValidMoney('.50')).toBe(false);
      expect(DecimalMath.isValidMoney('50.')).toBe(false);
      expect(DecimalMath.isValidMoney('10.999')).toBe(false);
      expect(DecimalMath.isValidMoney('10 000')).toBe(false);
      expect(DecimalMath.isValidMoney(100 as any)).toBe(false);
    });

    it('accepts valid rate string formats (positive only, up to 4 decimals)', () => {
      expect(DecimalMath.isValidRate('1')).toBe(true);
      expect(DecimalMath.isValidRate('1.0000')).toBe(true);
      expect(DecimalMath.isValidRate('0.0800')).toBe(true);
      expect(DecimalMath.isValidRate('15.5412')).toBe(true);
      expect(DecimalMath.isValidRate('15.50')).toBe(true);
    });

    it('rejects invalid rate inputs: zero, negative, signs, more than 4 decimals', () => {
      expect(DecimalMath.isValidRate('0')).toBe(false);
      expect(DecimalMath.isValidRate('0.0000')).toBe(false);
      expect(DecimalMath.isValidRate('-1.5')).toBe(false);
      expect(DecimalMath.isValidRate('+1.5')).toBe(false);
      expect(DecimalMath.isValidRate('1.12345')).toBe(false);
    });
  });
});
