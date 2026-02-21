import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить уведомления',
    description: 'Поддерживает фильтр по статусу и пагинацию',
  })
  @ApiOkResponse({
    description: 'Список уведомлений с метаданными пагинации',
    schema: {
      example: {
        items: [
          {
            id: '1625f041-62b0-4a8d-88e7-f5da7f89fdb3',
            userId: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
            title: 'New grade',
            body: 'You received grade 5',
            type: 'grade',
            status: 'unread',
            readAt: null,
            createdAt: '2026-02-21T08:00:00.000Z',
            updatedAt: '2026-02-21T08:00:00.000Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 42,
        totalPages: 3,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.list(user.sub, query);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Отметить все уведомления как прочитанные' })
  @ApiOkResponse({
    description: 'Количество обновленных уведомлений',
    schema: { example: { updated: 12 } },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Отметить уведомление как прочитанное' })
  @ApiParam({ name: 'id', description: 'ID уведомления', format: 'uuid' })
  @ApiOkResponse({
    description: 'Обновленное уведомление',
    schema: {
      example: {
        id: '1625f041-62b0-4a8d-88e7-f5da7f89fdb3',
        status: 'read',
        readAt: '2026-02-21T10:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiNotFoundResponse({ description: 'Уведомление не найдено' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }
}
