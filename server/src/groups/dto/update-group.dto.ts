import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateGroupDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Курс (1–4)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  course?: number;

  @ApiPropertyOptional({
    example: 'A',
    description: 'Название/буква группы, 1–32 символа',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  groupName?: string;
}
