import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'student.a',
    description: 'Логин пользователя',
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
    minLength: 6,
    description: 'Пароль пользователя',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
