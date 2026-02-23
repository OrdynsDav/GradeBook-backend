import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    example: 1,
    description: 'Курс (1–4)',
  })
  @IsInt()
  @Min(1)
  @Max(4)
  course!: number;

  @ApiProperty({
    example: 'A',
    description: 'Название/буква группы, 1–32 символа',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  groupName!: string;
}
