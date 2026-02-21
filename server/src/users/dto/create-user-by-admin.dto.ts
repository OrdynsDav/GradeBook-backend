import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum CreatableRole {
  student = 'student',
  teacher = 'teacher',
}

export class CreateUserByAdminDto {
  @ApiProperty({
    enum: CreatableRole,
    example: CreatableRole.student,
    description: 'Роль нового пользователя',
  })
  @IsEnum(CreatableRole)
  role!: CreatableRole;

  @ApiProperty({
    example: 'Nikita',
    description: 'Имя',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName!: string;

  @ApiProperty({
    example: 'Ivanov',
    description: 'Фамилия',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName!: string;

  @ApiPropertyOptional({
    example: 'Petrovich',
    description: 'Отчество',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  middleName?: string;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Курс (обязательно для student, опционально для teacher для совместимости формы)',
  })
  @ValidateIf((dto: CreateUserByAdminDto) => dto.role === CreatableRole.student)
  @IsInt()
  @Min(1)
  @Max(8)
  course?: number;

  @ApiPropertyOptional({
    example: 'A',
    description:
      'Группа (обязательно для student, опционально для teacher для совместимости формы)',
  })
  @ValidateIf((dto: CreateUserByAdminDto) => dto.role === CreatableRole.student)
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  group?: string;

  @ApiProperty({
    example: 'student.a',
    description: 'Логин',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'login can contain only letters, numbers, dot, underscore, dash',
  })
  login!: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 8,
    description: 'Пароль',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
