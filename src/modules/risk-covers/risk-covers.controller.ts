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
import { RiskCoversService } from './risk-covers.service.js';
import { CreateRiskCoverDto } from './dto/create-risk-cover.dto.js';
import { QueryRiskCoversDto } from './dto/query-risk-covers.dto.js';
import { RiskCoverResponseDto } from './dto/risk-cover-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

@ApiTags('Risk Covers')
@Controller('risk-covers')
export class RiskCoversController {
  constructor(private readonly riskCoversService: RiskCoversService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new risk cover in the catalogue' })
  @ApiResponse({ status: 201, description: 'Risk cover created', type: RiskCoverResponseDto })
  @ApiResponse({ status: 409, description: 'Risk cover code already exists' })
  async create(@Body() dto: CreateRiskCoverDto): Promise<RiskCoverResponseDto> {
    return this.riskCoversService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated list of risk covers' })
  @ApiResponse({ status: 200, description: 'Paginated risk covers' })
  async findAll(@Query() query: QueryRiskCoversDto): Promise<PaginatedResponseDto<RiskCoverResponseDto>> {
    return this.riskCoversService.findAll(query);
  }

  @Get('options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all active risk covers for form selectors' })
  @ApiResponse({ status: 200, description: 'Active risk-cover selector options', type: [RiskCoverResponseDto] })
  async findOptions(): Promise<RiskCoverResponseDto[]> {
    return this.riskCoversService.findOptions();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get risk cover details by ID' })
  @ApiParam({ name: 'id', description: 'Risk cover UUID' })
  @ApiResponse({ status: 200, description: 'Risk cover details', type: RiskCoverResponseDto })
  @ApiResponse({ status: 404, description: 'Risk cover not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RiskCoverResponseDto> {
    return this.riskCoversService.findOne(id);
  }
}
