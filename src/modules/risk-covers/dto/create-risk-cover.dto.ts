import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RiskCoverStatus } from '@prisma/client';

export class CreateRiskCoverDto {
  @ApiProperty({
    description: 'Unique risk cover code (e.g. "ACC_DAMAGE", "THEFT")',
    example: 'ACC_DAMAGE',
    maxLength: 50,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Display name of the risk cover',
    example: 'Accidental Damage',
    maxLength: 200,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Detailed description of the cover',
    example: 'Covers sudden and unforeseen physical damage to insured property.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Status of the risk cover',
    enum: RiskCoverStatus,
    default: RiskCoverStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RiskCoverStatus)
  status?: RiskCoverStatus = RiskCoverStatus.ACTIVE;
}
