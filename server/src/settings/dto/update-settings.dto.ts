import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { ThemeMode } from '@prisma/client';

export class NotificationsSettingsDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Глобальный toggle уведомлений',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Уведомления об оценках',
  })
  @IsOptional()
  @IsBoolean()
  grades?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Уведомления о домашнем задании',
  })
  @IsOptional()
  @IsBoolean()
  homework?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Уведомления об объявлениях',
  })
  @IsOptional()
  @IsBoolean()
  announcements?: boolean;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    enum: ThemeMode,
    example: ThemeMode.dark,
    description: 'Режим темы приложения',
  })
  @IsOptional()
  @IsEnum(ThemeMode)
  themeMode?: ThemeMode;

  @ApiPropertyOptional({
    type: NotificationsSettingsDto,
    description: 'Настройки уведомлений',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsSettingsDto)
  notifications?: NotificationsSettingsDto;
}
