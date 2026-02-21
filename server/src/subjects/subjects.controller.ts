import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/security/decorators/current-user.decorator';
import { Roles } from '../common/security/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { CreateGradeDto } from './dto/create-grade.dto';
import { SubjectsQueryDto } from './dto/subjects-query.dto';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список предметов' })
  @ApiOkResponse({
    description: 'Список предметов с учителем и классом',
    schema: {
      example: [
        {
          id: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
          name: 'Mathematics',
          classRoomId: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          teacherId: 'f72fca09-8925-4f2c-a2f8-7f039ae0f877',
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
          createdAt: '2026-02-21T16:00:00.000Z',
          updatedAt: '2026-02-21T16:00:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SubjectsQueryDto,
  ) {
    return this.subjectsService.list(user, query);
  }

  @Get(':id/grades')
  @ApiOperation({ summary: 'Получить оценки по предмету' })
  @ApiParam({ name: 'id', description: 'ID предмета', format: 'uuid' })
  @ApiOkResponse({
    description: 'Список оценок по предмету',
    schema: {
      example: [
        {
          id: '7f52a18b-1d86-4689-bc6d-e6f6c4bff4eb',
          subjectId: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
          studentId: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
          createdById: 'f72fca09-8925-4f2c-a2f8-7f039ae0f877',
          value: 5,
          comment: 'Great work',
          gradedAt: '2026-02-21T08:00:00.000Z',
          createdAt: '2026-02-21T08:01:00.000Z',
          updatedAt: '2026-02-21T08:01:00.000Z',
          student: {
            id: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
            firstName: 'Nikita',
            lastName: 'Ivanov',
            middleName: null,
          },
          createdBy: {
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
  @ApiForbiddenResponse({ description: 'Нет прав на просмотр оценок' })
  @ApiNotFoundResponse({ description: 'Предмет не найден' })
  getGrades(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.subjectsService.getGrades(id, user);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Получить статистику по предмету' })
  @ApiParam({ name: 'id', description: 'ID предмета', format: 'uuid' })
  @ApiOkResponse({
    description: 'Статистика оценок',
    schema: {
      example: {
        subjectId: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
        count: 12,
        average: 4.42,
        min: 3,
        max: 5,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Нет прав на просмотр статистики' })
  @ApiNotFoundResponse({ description: 'Предмет не найден' })
  getStats(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.subjectsService.getStats(id, user);
  }

  @Post(':id/grades')
  @Roles(Role.teacher, Role.admin)
  @ApiOperation({ summary: 'Создать оценку по предмету (teacher/admin)' })
  @ApiParam({ name: 'id', description: 'ID предмета', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Оценка успешно создана',
    schema: {
      example: {
        id: '7f52a18b-1d86-4689-bc6d-e6f6c4bff4eb',
        subjectId: 'd12de61b-4f43-4047-9d96-c4e94b9be740',
        studentId: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
        createdById: 'f72fca09-8925-4f2c-a2f8-7f039ae0f877',
        value: 5,
        comment: 'Excellent',
        gradedAt: '2026-02-21T08:00:00.000Z',
        createdAt: '2026-02-21T08:01:00.000Z',
        updatedAt: '2026-02-21T08:01:00.000Z',
        deletedAt: null,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Невалидный payload' })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  @ApiNotFoundResponse({ description: 'Предмет или студент не найдены' })
  createGrade(
    @Param('id') id: string,
    @Body() dto: CreateGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subjectsService.createGrade(id, dto, user);
  }
}
