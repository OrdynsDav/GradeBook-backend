import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/security/decorators/current-user.decorator';
import { Roles } from '../common/security/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { ScheduleService } from './schedule.service';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@ApiTags('schedule')
@ApiBearerAuth()
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Создать урок (admin)' })
  @ApiCreatedResponse({
    description: 'Урок создан',
    schema: {
      example: {
        id: '0df0eab6-a247-4dcf-ac73-9bb507f9d8cf',
        startsAt: '2026-02-21T06:00:00.000Z',
        endsAt: '2026-02-21T06:45:00.000Z',
        room: '101',
        subject: {
          id: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
          name: 'Mathematics',
        },
        classRoom: {
          id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          name: '2A',
          course: 2,
          groupName: 'A',
        },
        teacher: {
          id: 'f72fca09-8925-4f2c-a2f8-7f039ae0f877',
          firstName: 'Ivan',
          lastName: 'Petrov',
          middleName: 'Sergeevich',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({
    description: 'Только admin может управлять расписанием',
  })
  @ApiNotFoundResponse({ description: 'Предмет не найден' })
  createLesson(@Body() dto: CreateLessonDto) {
    return this.scheduleService.createLesson(dto);
  }

  @Patch(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Обновить урок (admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID урока' })
  @ApiOkResponse({
    description: 'Урок обновлен',
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({
    description: 'Только admin может управлять расписанием',
  })
  @ApiNotFoundResponse({ description: 'Урок или предмет не найден' })
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.scheduleService.updateLesson(id, dto);
  }

  @Delete(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Удалить урок (admin)' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID урока' })
  @ApiOkResponse({
    description: 'Урок удален',
    schema: {
      example: { success: true },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({
    description: 'Только admin может управлять расписанием',
  })
  @ApiNotFoundResponse({ description: 'Урок не найден' })
  deleteLesson(@Param('id') id: string) {
    return this.scheduleService.deleteLesson(id);
  }

  @Get('week')
  @ApiOperation({
    summary: 'Получить расписание на неделю',
    description:
      'Для student возвращается расписание его класса, teacher/admin могут использовать фильтры',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Базовая дата недели в формате YYYY-MM-DD (Europe/Moscow)',
    example: '2026-02-21',
  })
  @ApiOkResponse({
    description: 'Список уроков за неделю',
    schema: {
      example: [
        {
          id: '0df0eab6-a247-4dcf-ac73-9bb507f9d8cf',
          startsAt: '2026-02-21T06:00:00.000Z',
          endsAt: '2026-02-21T06:45:00.000Z',
          room: '101',
          subject: {
            id: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
            name: 'Mathematics',
          },
          classRoom: {
            id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
            name: '10A',
          },
          teacher: {
            id: 'f72fca09-8925-4f2c-a2f8-7f039ae0f877',
            firstName: 'Ivan',
            lastName: 'Petrov',
            middleName: 'Sergeevich',
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({
    description: 'Недостаточно прав для выбранного фильтра',
  })
  getWeek(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.scheduleService.getWeek(user, query);
  }

  @Get('day')
  @ApiOperation({
    summary: 'Получить расписание на день',
    description:
      'Для student возвращается расписание его класса, teacher/admin могут использовать фильтры',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Дата в формате YYYY-MM-DD (Europe/Moscow)',
    example: '2026-02-21',
  })
  @ApiOkResponse({
    description: 'Список уроков за день',
    schema: {
      example: [
        {
          id: '0df0eab6-a247-4dcf-ac73-9bb507f9d8cf',
          startsAt: '2026-02-21T06:00:00.000Z',
          endsAt: '2026-02-21T06:45:00.000Z',
          room: '101',
          subject: {
            id: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
            name: 'Mathematics',
          },
          classRoom: {
            id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
            name: '10A',
          },
          teacher: {
            id: 'f72fca09-8925-4f2c-a2f8-7f039ae0f877',
            firstName: 'Ivan',
            lastName: 'Petrov',
            middleName: 'Sergeevich',
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({
    description: 'Недостаточно прав для выбранного фильтра',
  })
  getDay(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.scheduleService.getDay(user, query);
  }
}
