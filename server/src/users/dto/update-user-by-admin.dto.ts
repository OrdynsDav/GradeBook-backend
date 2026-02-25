import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserByAdminDto {
  @ApiPropertyOptional({
    example: 'Nikita',
    minLength: 1,
    maxLength: 64,
    description: 'Имя',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Ivanov',
    minLength: 1,
    maxLength: 64,
    description: 'Фамилия',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Petrovich',
    maxLength: 64,
    description: 'Отчество',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  middleName?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID группы (для студента). Не передавать, чтобы не менять.',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    example: 'student.a',
    minLength: 3,
    maxLength: 64,
    description: 'Логин (уникальный)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'login can contain only letters, numbers, dot, underscore, dash',
  })
  login?: string;

  @ApiPropertyOptional({
    example: 'Password123!',
    minLength: 8,
    maxLength: 128,
    description: 'Новый пароль (если нужно сменить)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
