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
import { ExchangeRateSheetsService } from './exchange-rate-sheets.service.js';
import { CreateExchangeRateSheetDto } from './dto/create-exchange-rate-sheet.dto.js';
import { QueryExchangeRateSheetsDto } from './dto/query-exchange-rate-sheets.dto.js';
import {
  ExchangeRateSheetDetailDto,
  ExchangeRateSheetSummaryDto,
} from './dto/exchange-rate-sheet-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

@ApiTags('Exchange Rate Sheets')
@Controller('exchange-rate-sheets')
export class ExchangeRateSheetsController {
  constructor(private readonly exchangeRateSheetsService: ExchangeRateSheetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new immutable exchange rate sheet' })
  @ApiResponse({
    status: 201,
    description: 'Exchange rate sheet created',
    type: ExchangeRateSheetDetailDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid currency pairs or rates' })
  @ApiResponse({ status: 409, description: 'Duplicate effectiveAt timestamp' })
  async create(@Body() dto: CreateExchangeRateSheetDto): Promise<ExchangeRateSheetDetailDto> {
    return this.exchangeRateSheetsService.create(dto);
  }

  @Get('current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current active exchange rate sheet at current time' })
  @ApiResponse({
    status: 200,
    description: 'Current active exchange rate sheet',
    type: ExchangeRateSheetDetailDto,
  })
  @ApiResponse({ status: 404, description: 'No active exchange rate sheet found' })
  async getCurrent(): Promise<ExchangeRateSheetDetailDto> {
    return this.exchangeRateSheetsService.getCurrentSheet();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated list of exchange rate sheets' })
  @ApiResponse({ status: 200, description: 'Paginated list of rate sheets' })
  async findAll(
    @Query() query: QueryExchangeRateSheetsDto
  ): Promise<PaginatedResponseDto<ExchangeRateSheetSummaryDto>> {
    return this.exchangeRateSheetsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get exchange rate sheet details by ID' })
  @ApiParam({ name: 'id', description: 'Exchange rate sheet UUID' })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate sheet details with entries',
    type: ExchangeRateSheetDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Exchange rate sheet not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ExchangeRateSheetDetailDto> {
    return this.exchangeRateSheetsService.findOne(id);
  }
}
