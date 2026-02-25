import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateSubjectDto {
  @ApiPropertyOptional({
    example: 'Математика',
    minLength: 1,
    maxLength: 255,
    description: 'Название предмета',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID группы',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID учителя',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
