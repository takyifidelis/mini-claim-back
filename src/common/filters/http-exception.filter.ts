import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { errorResponse } from '../../shared/utils/response.js';

export interface ErrorResponseData {
  code: string;
  details?: Record<string, any> | Array<any>;
  timestamp: string;
  path: string;
}

/** Converts all thrown errors into safe, consistent HTTP error responses. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Handles expected HTTP/database errors and conceals unexpected error details.
   *
   * @param exception - Value thrown while processing the request.
   * @param host - NestJS arguments host for the current request.
   * @returns Nothing; the response is sent by the shared response helper.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();
    const path = request.url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal server error occurred.';
    let details: Record<string, any> | Array<any> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        code = this.getDefaultCodeForStatus(status);
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message ?? exception.message;
        code = obj.code ?? this.getDefaultCodeForStatus(status);
        if (obj.details !== undefined) {
          details = obj.details;
        } else if (Array.isArray(obj.message)) {
          // Class-validator error messages array
          details = obj.message;
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'CONFLICT';
        const target = exception.meta?.target;
        message = `Unique constraint violation on field(s): ${Array.isArray(target) ? target.join(', ') : target}`;
      } else if (exception.code === 'P2003') {
        status = HttpStatus.CONFLICT;
        code = 'FOREIGN_KEY_VIOLATION';
        message =
          'Foreign key restriction violation. Cannot modify or delete referenced record.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Record not found.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        code = `DATABASE_ERROR_${exception.code}`;
        message = 'A database constraint violation occurred.';
      }
    } else if (exception instanceof Error) {
      // Check for custom error properties
      const err = exception as any;
      if (
        err.message &&
        err.message.includes('immutable and cannot be updated or deleted')
      ) {
        status = HttpStatus.CONFLICT;
        code = 'IMMUTABLE_RECORD';
        message = err.message;
      } else {
        this.logUnexpectedError(request, exception);
      }
    } else {
      this.logUnexpectedError(request, exception);
    }

    const errorData: ErrorResponseData = {
      code,
      ...(details ? { details } : {}),
      timestamp,
      path,
    };

    errorResponse(
      response,
      status,
      Array.isArray(message) ? message.join('; ') : message,
      errorData,
    );
  }

  /** Logs unexpected failures as structured JSON without exposing them to clients. */
  private logUnexpectedError(request: Request, exception: unknown): void {
    const error = exception instanceof Error ? exception : undefined;

    this.logger.error(
      JSON.stringify({
        event: 'unhandled_http_exception',
        method: request.method,
        path: request.url,
        message: error?.message ?? String(exception),
        ...(process.env.NODE_ENV !== 'production' && error?.stack
          ? { stack: error.stack }
          : {}),
      }),
    );
  }

  private getDefaultCodeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      default:
        return 'ERROR';
    }
  }
}
