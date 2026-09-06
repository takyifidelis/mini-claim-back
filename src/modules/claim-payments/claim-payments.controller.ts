import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ClaimPaymentsService } from './claim-payments.service.js';
import { CreateClaimPaymentDto } from './dto/create-claim-payment.dto.js';
import { QueryClaimPaymentsDto } from './dto/query-claim-payments.dto.js';
import { ClaimPaymentResponseDto } from './dto/claim-payment-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

@ApiTags('Claim Payments')
@Controller('claims/:id/payments')
export class ClaimPaymentsController {
  constructor(private readonly claimPaymentsService: ClaimPaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record an immutable payment against an approved claim using policy locked exchange rates' })
  @ApiParam({ name: 'id', description: 'Claim UUID' })
  @ApiResponse({ status: 201, description: 'Payment recorded', type: ClaimPaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input, amount, or date' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  @ApiResponse({ status: 409, description: 'Version conflict or overpayment confirmation required' })
  @ApiResponse({ status: 422, description: 'Claim not approved or missing locked exchange rate pair' })
  async create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateClaimPaymentDto
  ): Promise<ClaimPaymentResponseDto> {
    return this.claimPaymentsService.create(id, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated payment history for a claim' })
  @ApiParam({ name: 'id', description: 'Claim UUID' })
  @ApiResponse({ status: 200, description: 'Paginated payment list' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  async findAll(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryClaimPaymentsDto
  ): Promise<PaginatedResponseDto<ClaimPaymentResponseDto>> {
    return this.claimPaymentsService.findAllByClaim(id, query);
  }
}
