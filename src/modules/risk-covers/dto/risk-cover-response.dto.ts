import { ApiProperty } from '@nestjs/swagger';
import { RiskCoverStatus, RiskCover } from '@prisma/client';

export class RiskCoverResponseDto {
  @ApiProperty({ description: 'UUID primary key', example: 'd3b07384-d113-4a17-b088-3485fa500123' })
  id: string;

  @ApiProperty({ description: 'Unique uppercase code', example: 'ACC_DAMAGE' })
  code: string;

  @ApiProperty({ description: 'Display name', example: 'Accidental Damage' })
  name: string;

  @ApiProperty({ description: 'Description', example: 'Covers unforeseen physical damage.' })
  description: string;

  @ApiProperty({ description: 'Status', enum: RiskCoverStatus, example: RiskCoverStatus.ACTIVE })
  status: RiskCoverStatus;

  @ApiProperty({ description: 'UTC creation timestamp', example: '2026-09-05T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Server-derived actor', example: 'demo_adjuster' })
  createdBy: string;

  static fromEntity(entity: RiskCover): RiskCoverResponseDto {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      createdBy: entity.createdBy,
    };
  }
}
