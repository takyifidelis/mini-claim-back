import { Decimal } from 'decimal.js';
import { MONEY_INPUT, RATE_INPUT } from '../constants/regex.constants.js';

// Configure Decimal precision and rounding globally for domain calculations
export const DecimalInstance = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
});

/**
 * Utility class for exact decimal calculations, formatting, and validation.
 */
export class DecimalMath {
  /**
   * Validates if the given value is a valid money string.
   * Format: non-negative integer or up to 2 decimal places, no signs, no commas, <= 15 integer digits.
   *
   * @param value - Value to test
   * @returns True if valid money string format
   */
  static isValidMoney(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return MONEY_INPUT.test(trimmed);
  }

  /**
   * Validates if the given value is a valid exchange rate string.
   * Format: positive integer or up to 8 decimal places, no signs, no commas, <= 15 integer digits.
   *
   * @param value - Value to test
   * @returns True if valid rate string format
   */
  static isValidRate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!RATE_INPUT.test(trimmed)) return false;
    const dec = new DecimalInstance(trimmed);
    return dec.greaterThan(0);
  }

  /**
   * Creates a DecimalInstance from string, number, or Decimal.
   *
   * @param value - Value to convert
   * @returns Decimal instance
   */
  static from(value: string | number | Decimal | any): Decimal {
    if (typeof value === 'object' && value !== null) {
      return new DecimalInstance(value.toString());
    }
    return new DecimalInstance(typeof value === 'string' ? value.trim() : (value ?? 0));
  }

  /**
   * Formats a money amount to a fixed 2-decimal string.
   * Example: 12.5 -> "12.50", 0 -> "0.00"
   *
   * @param value - Value to format
   * @returns Fixed 2-decimal string
   */
  static formatMoney(value: string | number | Decimal | null | undefined): string {
    if (value === null || value === undefined) {
      return '0.00';
    }
    const dec = DecimalMath.from(value);
    return dec.toFixed(2, DecimalInstance.ROUND_HALF_UP);
  }

  /**
   * Formats a nullable money amount to a fixed 2-decimal string or null.
   *
   * @param value - Value to format
   * @returns Fixed 2-decimal string or null
   */
  static formatNullableMoney(value: string | number | Decimal | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const dec = DecimalMath.from(value);
    return dec.toFixed(2, DecimalInstance.ROUND_HALF_UP);
  }

  /**
   * Formats an exchange rate to a fixed 4-decimal string (Bank of Ghana standard).
   * Example: 15.5412 -> "15.5412", 12.5 -> "12.5000"
   *
   * @param value - Value to format
   * @returns Fixed 4-decimal string
   */
  static formatRate(value: string | number | Decimal): string {
    const dec = DecimalMath.from(value);
    return dec.toFixed(4, DecimalInstance.ROUND_HALF_UP);
  }

  /**
   * Adds two decimal values.
   */
  static add(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return DecimalMath.from(a).plus(DecimalMath.from(b));
  }

  /**
   * Subtracts b from a.
   */
  static sub(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return DecimalMath.from(a).minus(DecimalMath.from(b));
  }

  /**
   * Multiplies two decimal values.
   */
  static mul(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return DecimalMath.from(a).times(DecimalMath.from(b));
  }

  /**
   * Divides a by b.
   */
  static div(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return DecimalMath.from(a).dividedBy(DecimalMath.from(b));
  }

  /**
   * Calculates cross-currency conversion: (amount * rate) rounded half-up to 2 decimals.
   *
   * @param amount - Source amount
   * @param rate - Exchange rate
   * @returns Converted amount rounded to 2 decimals
   */
  static convert(amount: string | number | Decimal, rate: string | number | Decimal): Decimal {
    const product = DecimalMath.mul(amount, rate);
    const rounded = product.toDecimalPlaces(2, DecimalInstance.ROUND_HALF_UP);
    return rounded;
  }

  /**
   * Compares two decimals. Returns true if a > b.
   */
  static isGreaterThan(a: string | number | Decimal, b: string | number | Decimal): boolean {
    return DecimalMath.from(a).greaterThan(DecimalMath.from(b));
  }

  /**
   * Compares two decimals. Returns true if a >= b.
   */
  static isGreaterThanOrEqualTo(a: string | number | Decimal, b: string | number | Decimal): boolean {
    return DecimalMath.from(a).greaterThanOrEqualTo(DecimalMath.from(b));
  }

  /**
   * Compares two decimals. Returns true if a < b.
   */
  static isLessThan(a: string | number | Decimal, b: string | number | Decimal): boolean {
    return DecimalMath.from(a).lessThan(DecimalMath.from(b));
  }

  /**
   * Compares two decimals. Returns true if a <= b.
   */
  static isLessThanOrEqualTo(a: string | number | Decimal, b: string | number | Decimal): boolean {
    return DecimalMath.from(a).lessThanOrEqualTo(DecimalMath.from(b));
  }

  /**
   * Checks if value equals 0.
   */
  static isZero(value: string | number | Decimal): boolean {
    return DecimalMath.from(value).isZero();
  }

  /**
   * Checks if value is strictly positive (> 0).
   */
  static isPositive(value: string | number | Decimal): boolean {
    return DecimalMath.from(value).greaterThan(0);
  }

  /**
   * Checks if value is strictly negative (< 0).
   */
  static isNegative(value: string | number | Decimal): boolean {
    return DecimalMath.from(value).isNegative() && !DecimalMath.from(value).isZero();
  }

  /**
   * Returns the absolute value as a Decimal.
   */
  static abs(value: string | number | Decimal): Decimal {
    return DecimalMath.from(value).abs();
  }
}
