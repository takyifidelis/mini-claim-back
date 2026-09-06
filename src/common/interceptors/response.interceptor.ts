import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  createSuccessResponse,
} from '../../shared/utils/response.js';

/** Wraps successful controller results in the application's response envelope. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  /**
   * Sends the controller result through the shared response helper.
   *
   * @param context - Current NestJS execution context.
   * @param next - Downstream controller handler.
   * @returns An observable that completes after the response is sent.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: T) => {
        const statusCode = response.statusCode;
        const message =
          statusCode === HttpStatus.CREATED
            ? 'Resource created successfully.'
            : 'Request successful.';

        return createSuccessResponse(statusCode, message, data);
      }),
    );
  }
}
