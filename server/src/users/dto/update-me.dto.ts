import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'Nikita',
    minLength: 1,
    maxLength: 64,
    description: 'Имя пользователя',
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
    description: 'Фамилия пользователя',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Petrovich',
    maxLength: 64,
    description: 'Отчество пользователя',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  middleName?: string;
}
