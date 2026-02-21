import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить пользовательские настройки' })
  @ApiOkResponse({
    description: 'Текущие настройки пользователя',
    schema: {
      example: {
        themeMode: 'system',
        notifications: {
          enabled: true,
          grades: true,
          homework: true,
          announcements: true,
        },
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getSettings(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить пользовательские настройки' })
  @ApiOkResponse({
    description: 'Обновленные настройки',
    schema: {
      example: {
        themeMode: 'dark',
        notifications: {
          enabled: true,
          grades: true,
          homework: false,
          announcements: true,
        },
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:10:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Невалидный payload' })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(user.sub, dto);
  }
}
