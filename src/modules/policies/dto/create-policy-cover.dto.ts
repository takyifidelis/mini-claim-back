import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsUUID } from '../../../common/decorators/is-uuid.decorator.js';
import { IsMoneyString } from '../../../common/decorators/is-money-string.decorator.js';

export class CreatePolicyCoverDto {
  @ApiProperty({
    description: 'UUID of the active risk cover catalogue item',
    example: 'd3b07384-d113-4a17-b088-3485fa500123',
  })
  @IsUUID()
  @IsNotEmpty()
  riskCoverId: string;

  @ApiProperty({
    description: 'Coverage limit in policy currency (positive monetary amount string)',
    example: '50000.00',
  })
  @IsMoneyString({ allowZero: false })
  @IsNotEmpty()
  coverageLimit: string;

  @ApiPropertyOptional({
    description: 'Deductible amount in policy currency (non-negative monetary amount string)',
    example: '500.00',
    default: '0.00',
  })
  @IsOptional()
  @IsMoneyString({ allowZero: true })
  deductibleAmount?: string = '0.00';

  @ApiPropertyOptional({
    description: 'Policy-specific terms for this cover',
    example: 'Subject to 10% co-insurance for flood damages.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  terms?: string;
}
