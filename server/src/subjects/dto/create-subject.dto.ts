import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({
    example: 'Математика',
    minLength: 1,
    maxLength: 255,
    description: 'Название предмета',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'ID группы',
  })
  @IsUUID()
  groupId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'ID учителя',
  })
  @IsUUID()
  teacherId!: string;
}
