import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ReviewDecision } from '@prisma/client';

export class CreateClaimReviewDto {
  @ApiProperty({
    description: 'Expected claim version for optimistic concurrency control',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  expectedVersion: number;

  @ApiProperty({
    description: 'Review decision (APPROVED or DENIED)',
    enum: ReviewDecision,
    example: ReviewDecision.APPROVED,
  })
  @IsEnum(ReviewDecision)
  @IsNotEmpty()
  decision: ReviewDecision;

  @ApiProperty({
    description: 'Required explanation for the decision (non-blank trimmed string)',
    example: 'Incident verified against policy coverage terms and evidence submitted.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  reason: string;
}
