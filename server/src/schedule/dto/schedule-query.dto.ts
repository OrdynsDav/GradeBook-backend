import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ScheduleQueryDto {
  @ApiProperty({
    example: '2026-02-21',
    description: 'Дата в формате YYYY-MM-DD (Europe/Moscow)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Фильтр по группе (teacher/admin)',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Фильтр по учителю (admin)',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
