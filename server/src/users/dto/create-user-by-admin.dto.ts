import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum CreatableRole {
  student = 'student',
  teacher = 'teacher',
}

/** Один предмет при создании учителя: название + одна группа или несколько (groupIds) */
export class CreateTeacherSubjectDto {
  @ApiProperty({
    example: 'Mathematics',
    description: 'Название предмета',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({
    example: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
    description:
      'UUID одной группы. Не указывать, если задан groupIds (один предмет — много групп).',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    example: [
      'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
      'a1b2c3d4-6866-4df6-8d43-1c2f4d8f4488',
    ],
    description:
      'Массив UUID групп: один предмет сразу для нескольких групп. Вместо 40 строк с одним именем — одна строка с 40 groupIds.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds?: string[];
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
  @Max(4)
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

  @ApiPropertyOptional({
    type: [CreateTeacherSubjectDto],
    example: [
      { name: 'Mathematics', groupId: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488' },
      {
        name: 'Physics',
        groupIds: [
          'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          'a1b2c3d4-6866-4df6-8d43-1c2f4d8f4488',
        ],
      },
    ],
    description:
      'Предметы учителя (только для role=teacher): название + одна группа (groupId) или несколько (groupIds)',
  })
  @ValidateIf((dto: CreateUserByAdminDto) => dto.role === CreatableRole.teacher)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTeacherSubjectDto)
  subjects?: CreateTeacherSubjectDto[];

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
