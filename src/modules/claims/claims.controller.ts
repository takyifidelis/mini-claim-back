import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ClaimsService } from './claims.service.js';
import { CreateClaimDto } from './dto/create-claim.dto.js';
import { UpdateClaimDto } from './dto/update-claim.dto.js';
import { CreateClaimReviewDto } from './dto/create-claim-review.dto.js';
import {
  UpdateApprovedPayoutDto,
  ClearApprovedPayoutDto,
} from './dto/update-approved-payout.dto.js';
import { QueryClaimsDto } from './dto/query-claims.dto.js';
import {
  ClaimDetailDto,
  PaginatedClaimsResponseDto,
} from './dto/claim-response.dto.js';

@ApiTags('Claims')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new claim under review' })
  @ApiResponse({ status: 201, description: 'Claim created', type: ClaimDetailDto })
  @ApiResponse({ status: 400, description: 'Invalid input, date range, or cover assignment' })
  @ApiResponse({ status: 404, description: 'Policy or cover not found' })
  async create(@Body() dto: CreateClaimDto): Promise<ClaimDetailDto> {
    return this.claimsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated list of claims with filters and pre-pagination grouped totals' })
  @ApiResponse({ status: 200, description: 'Paginated claims response with totalsByCurrency', type: PaginatedClaimsResponseDto })
  async findAll(@Query() query: QueryClaimsDto): Promise<PaginatedClaimsResponseDto> {
    return this.claimsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get claim details with review and payments by ID' })
  @ApiParam({ name: 'id', description: 'Claim UUID' })
  @ApiResponse({ status: 200, description: 'Claim details', type: ClaimDetailDto })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClaimDetailDto> {
    return this.claimsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update claim eligibility facts while UNDER_REVIEW' })
  @ApiParam({ name: 'id', description: 'Claim UUID' })
  @ApiResponse({ status: 200, description: 'Claim updated', type: ClaimDetailDto })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  @ApiResponse({ status: 409, description: 'Claim version conflict' })
  @ApiResponse({ status: 422, description: 'Cannot edit claim facts after review' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClaimDto
  ): Promise<ClaimDetailDto> {
    return this.claimsService.update(id, dto);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record one-time review decision (APPROVED or DENIED)' })
  @ApiParam({ name: 'id', description: 'Claim UUID' })
  @ApiResponse({ status: 200, description: 'Review recorded', type: ClaimDetailDto })
  @ApiResponse({ status: 400, description: 'Missing reason or invalid input' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  @ApiResponse({ status: 409, description: 'Claim already reviewed or version conflict' })
  async createReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateClaimReviewDto
  ): Promise<ClaimDetailDto> {
    return this.claimsService.createReview(id, dto);
  }

  @Put(':id/approved-payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or update approved payout amount on an approved claim' })
  @ApiParam({ name: 'id', description: 'Claim UUID' })
  @ApiResponse({ status: 200, description: 'Approved payout set', type: ClaimDetailDto })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  @ApiResponse({ status: 409, description: 'Version conflict or overpayment confirmation required' })
  @ApiResponse({ status: 422, description: 'Claim not approved or payout exceeds limit' })
  async setApprovedPayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApprovedPayoutDto
  ): Promise<ClaimDetailDto> {
    return this.claimsService.setApprovedPayout(id, dto);
  }

  @Delete(':id/approved-payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear approved payout back to null before payments exist' })
  @ApiParam({ name: 'id', description: 'Claim UUID' })
  @ApiResponse({ status: 200, description: 'Approved payout cleared', type: ClaimDetailDto })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  @ApiResponse({ status: 409, description: 'Version conflict or payments already exist' })
  async clearApprovedPayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClearApprovedPayoutDto
  ): Promise<ClaimDetailDto> {
    return this.claimsService.clearApprovedPayout(id, dto);
  }
}
