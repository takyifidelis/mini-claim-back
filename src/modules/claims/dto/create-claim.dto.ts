import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { IsUUID } from '../../../common/decorators/is-uuid.decorator.js';
import { IsMoneyString } from '../../../common/decorators/is-money-string.decorator.js';

export class CreateClaimDto {
  @ApiProperty({ description: 'Policy UUID', example: 'd3b07384-d113-4a17-b088-3485fa500123' })
  @IsUUID()
  @IsNotEmpty()
  policyId: string;

  @ApiProperty({
    description: 'Policy risk cover UUID (must belong to the policy)',
    example: 'd3b07384-d113-4a17-b088-3485fa500124',
  })
  @IsUUID()
  @IsNotEmpty()
  policyRiskCoverId: string;

  @ApiProperty({ description: 'Loss date (YYYY-MM-DD)', example: '2026-03-15' })
  @IsDateString()
  @IsNotEmpty()
  lossDate: string;

  @ApiProperty({ description: 'Date notified (YYYY-MM-DD)', example: '2026-03-16' })
  @IsDateString()
  @IsNotEmpty()
  dateNotified: string;

  @ApiProperty({
    description: 'Nature and details of the loss incident',
    example: 'Collision with barrier during transit causing cargo damage.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  lossNature: string;

  @ApiProperty({
    description: 'Estimated loss amount in policy currency (non-negative monetary string)',
    example: '15000.00',
  })
  @IsMoneyString({ allowZero: true })
  @IsNotEmpty()
  estimatedLossAmount: string;
}
