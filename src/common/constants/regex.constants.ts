/**
 * Strict regex for money string inputs.
 * Accepts only integers or decimals with up to 2 fractional digits.
 * No signs, commas, exponent notation, or leading zeros.
 */
export const MONEY_INPUT = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,2})?$/;

/**
 * Strict regex for exchange rate string inputs (Bank of Ghana 4-decimal standard).
 * Accepts only integers or decimals with up to 4 fractional digits.
 * No signs, commas, exponent notation, or leading zeros.
 */
export const RATE_INPUT = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

/**
 * Standard error codes for domain and operational errors.
 */
export const ERROR_CODES = {
  OVERPAYMENT_CONFIRMATION_REQUIRED: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
  CLAIM_VERSION_CONFLICT: 'CLAIM_VERSION_CONFLICT',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
