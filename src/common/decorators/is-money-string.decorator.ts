import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { MONEY_INPUT } from '../constants/regex.constants.js';
import { DecimalMath } from '../utils/decimal.util.js';

export interface IsMoneyStringOptions {
  allowZero?: boolean;
  min?: string;
  max?: string;
}

/**
 * Custom decorator to validate that a property is a valid money string.
 * Rejects numbers, signs, commas, exponent notation, or more than 2 decimal places.
 */
export function IsMoneyString(
  options?: IsMoneyStringOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMoneyString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (!MONEY_INPUT.test(trimmed)) return false;

          const allowZero = options?.allowZero !== false; // default true
          const isZero = DecimalMath.isZero(trimmed);

          if (!allowZero && isZero) {
            return false;
          }

          if (options?.min && DecimalMath.isLessThan(trimmed, options.min)) {
            return false;
          }

          if (options?.max && DecimalMath.isGreaterThan(trimmed, options.max)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const allowZero = options?.allowZero !== false;
          if (!allowZero) {
            return `${args.property} must be a positive monetary amount string with up to 2 decimal places (e.g. "100.00")`;
          }
          return `${args.property} must be a non-negative monetary amount string with up to 2 decimal places (e.g. "100.00")`;
        },
      },
    });
  };
}
