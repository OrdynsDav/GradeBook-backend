import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { ImportScheduleBodyDto } from './dto/import-schedule-body.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { ScheduleImportService } from './schedule-import.service';
import { ScheduleService } from './schedule.service';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@ApiTags('schedule')
@ApiBearerAuth()
@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly scheduleImportService: ScheduleImportService,
  ) {}

  @Post('import')
  @Roles(Role.admin)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'Либо multipart с полем "file", либо JSON: { "fileBase64": "<base64>" }',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
          },
          required: ['file'],
        },
        {
          type: 'object',
          properties: { fileBase64: { type: 'string', description: 'Содержимое .xlsx в base64' } },
          required: ['fileBase64'],
        },
      ],
    },
  })
  @ApiOperation({
    summary: 'Импорт расписания из Excel (admin)',
    description:
      'Загрузка .xlsx: multipart/form-data с полем "file" или JSON с полем "fileBase64". Ожидается структура: заголовок с группами (D+), блоки по 3 строки — Предмет, Преподаватель, Кабинет.',
  })
  @ApiOkResponse({
    description: 'Результат импорта',
    schema: {
      example: { created: 42, skipped: 3, errors: ['Teacher not found: "Иванов И.И." (2026-02-24 Математика)'] },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Только admin' })
  async importFromExcel(
    @UploadedFile() file: Express.Multer.File & { buffer?: Buffer },
    @Body() body?: ImportScheduleBodyDto,
  ) {
    let buffer: Buffer | null = null;
    if (file) {
      try {
        buffer = this.toBuffer(file);
      } catch {
        buffer = null;
      }
    }
    if (!buffer && body?.fileBase64) {
      try {
        buffer = Buffer.from(body.fileBase64, 'base64');
      } catch {
        throw new BadRequestException('Invalid fileBase64: must be valid base64.');
      }
    }
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException(
        'File is required. Send multipart/form-data with field "file", or JSON body with "fileBase64" (Excel file content in base64).',
      );
    }
    return this.scheduleImportService.importFromExcel(buffer);
  }

  private toBuffer(file: Express.Multer.File & { buffer?: unknown }): Buffer {
    const data = file.buffer as Buffer | ArrayBuffer | ArrayBufferView | null | undefined;
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof ArrayBuffer) return Buffer.from(data);
    if (ArrayBuffer.isView(data)) {
      const view = data as ArrayBufferView;
      return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
    }
    throw new BadRequestException(
      'Invalid file upload: expected binary data. Use multipart/form-data with field "file" and the Excel file as binary.',
    );
  }

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
        group: {
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
      'Для student возвращается расписание его группы, teacher/admin могут использовать фильтры',
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
          group: {
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
      'Для student возвращается расписание его группы, teacher/admin могут использовать фильтры',
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
          group: {
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
