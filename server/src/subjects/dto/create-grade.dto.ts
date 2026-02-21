import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGradeDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID студента',
  })
  @IsUUID()
  studentId!: string;

  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Значение оценки',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  value!: number;

  @ApiPropertyOptional({
    example: 'Great work',
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
