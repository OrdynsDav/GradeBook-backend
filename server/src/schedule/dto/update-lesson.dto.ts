import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateLessonDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID предмета',
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({
    example: '2026-02-21T08:00:00.000Z',
    description: 'Начало урока (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    example: '2026-02-21T08:45:00.000Z',
    description: 'Окончание урока (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    example: '101',
    description: 'Аудитория',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  room?: string;
}
