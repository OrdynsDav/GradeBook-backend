import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SubjectsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Фильтр по классу (teacher/admin)',
  })
  @IsOptional()
  @IsUUID()
  classRoomId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Фильтр по учителю (admin)',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
