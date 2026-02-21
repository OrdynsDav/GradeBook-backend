import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные дашборда' })
  @ApiOkResponse({
    description:
      'Агрегированные показатели: средний балл, уроки сегодня, непрочитанные уведомления и краткое расписание',
    schema: {
      example: {
        averageGrade: 4.7,
        lessonsToday: 4,
        unreadNotifications: 3,
        todaySchedule: [
          {
            id: '0df0eab6-a247-4dcf-ac73-9bb507f9d8cf',
            startsAt: '2026-02-21T06:00:00.000Z',
            endsAt: '2026-02-21T06:45:00.000Z',
            room: '101',
            subject: {
              id: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
              name: 'Mathematics',
            },
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getDashboard(user);
  }
}
