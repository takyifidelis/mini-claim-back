import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { RATE_INPUT } from '../constants/regex.constants.js';
import { DecimalMath } from '../utils/decimal.util.js';

/**
 * Custom decorator to validate that a property is a valid exchange rate string.
 * Must be positive, up to 4 decimal places, no signs, no commas, no exponent notation (Bank of Ghana standard).
 */
export function IsRateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRateString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (!RATE_INPUT.test(trimmed)) return false;
          return DecimalMath.isPositive(trimmed);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive exchange rate string with up to 4 decimal places (e.g. "15.5412")`;
        },
      },
    });
  };
}
