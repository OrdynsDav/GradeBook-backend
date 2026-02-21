import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    example: 'u8tp_BA5M0mGT41j-Lm9M8mQ9V6P9w7u6hL6q6ElFv4aU9aHzQhN4t0AObw0M2kR',
    minLength: 32,
    description: 'Refresh opaque token для завершения текущей сессии',
  })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
