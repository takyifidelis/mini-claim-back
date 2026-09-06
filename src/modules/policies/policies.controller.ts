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
import { PoliciesService } from './policies.service.js';
import { CreatePolicyDto } from './dto/create-policy.dto.js';
import { QueryPoliciesDto } from './dto/query-policies.dto.js';
import { PolicyDetailDto, PolicySummaryDto } from './dto/policy-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

@ApiTags('Policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new policy with assigned covers and lock the current rate sheet' })
  @ApiResponse({ status: 201, description: 'Policy created', type: PolicyDetailDto })
  @ApiResponse({ status: 400, description: 'Invalid input or date range' })
  @ApiResponse({ status: 404, description: 'Risk cover not found' })
  @ApiResponse({ status: 422, description: 'Inactive cover or missing active exchange rate sheet' })
  async create(@Body() dto: CreatePolicyDto): Promise<PolicyDetailDto> {
    return this.policiesService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated list of policies' })
  @ApiResponse({ status: 200, description: 'Paginated list of policies' })
  async findAll(@Query() query: QueryPoliciesDto): Promise<PaginatedResponseDto<PolicySummaryDto>> {
    return this.policiesService.findAll(query);
  }

  @Get('options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the complete policy collection for form selectors' })
  @ApiResponse({ status: 200, description: 'Policy selector options', type: [PolicySummaryDto] })
  async findOptions(): Promise<PolicySummaryDto[]> {
    return this.policiesService.findOptions();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get policy details with covers and locked rate sheet by ID' })
  @ApiParam({ name: 'id', description: 'Policy UUID' })
  @ApiResponse({ status: 200, description: 'Policy details', type: PolicyDetailDto })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PolicyDetailDto> {
    return this.policiesService.findOne(id);
  }
}
