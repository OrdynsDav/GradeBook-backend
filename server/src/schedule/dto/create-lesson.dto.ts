import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'ID предмета. teacher/classRoom берутся из предмета автоматически',
  })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({
    example: '2026-02-21T08:00:00.000Z',
    description: 'Начало урока (ISO 8601)',
  })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({
    example: '2026-02-21T08:45:00.000Z',
    description: 'Окончание урока (ISO 8601)',
  })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({
    example: '101',
    description: 'Аудитория',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  room?: string;
}
