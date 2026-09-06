import type { Response } from 'express';

/** Standard API response envelope. */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

/**
 * Creates a successful response envelope for NestJS to serialize.
 *
 * @param statusCode - HTTP success status code.
 * @param message - Human-readable outcome.
 * @param data - Response payload.
 * @returns A standard success response envelope.
 */
export function createSuccessResponse<T>(
  statusCode: number,
  message: string,
  data: T,
): ApiResponse<T> {
  return { success: true, statusCode, message, data };
}

/**
 * Sends a successful API response using the standard envelope.
 *
 * @param response - Express response managed by NestJS.
 * @param statusCode - HTTP success status code.
 * @param message - Human-readable outcome.
 * @param data - Response payload.
 * @returns The completed Express response.
 */
export function successResponse<T>(
  response: Response,
  statusCode: number,
  message: string,
  data: T,
): Response<ApiResponse<T>> {
  return response
    .status(statusCode)
    .json(createSuccessResponse(statusCode, message, data));
}

/**
 * Sends an unsuccessful API response using the standard envelope.
 *
 * @param response - Express response managed by NestJS.
 * @param statusCode - HTTP error status code.
 * @param message - Safe, human-readable error message.
 * @param data - Structured error metadata.
 * @returns The completed Express response.
 */
export function errorResponse<T>(
  response: Response,
  statusCode: number,
  message: string,
  data: T,
): Response<ApiResponse<T>> {
  return response.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data,
  });
}
