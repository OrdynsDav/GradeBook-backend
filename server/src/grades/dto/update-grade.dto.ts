import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateGradeDto {
  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 5,
    description: 'Новое значение оценки',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  value?: number;

  @ApiPropertyOptional({
    example: 'Needs more detail',
    maxLength: 500,
    description: 'Комментарий к оценке',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({
    example: '2026-02-21T09:10:00.000Z',
    description: 'Дата/время оценки в ISO 8601',
  })
  @IsOptional()
  @IsDateString()
  gradedAt?: string;
}
