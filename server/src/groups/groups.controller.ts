import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { Roles } from '../common/security/decorators/roles.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({
    summary: 'Список групп',
    description:
      'Для выбора групп при создании учителя/студента и при создании уроков. Доступно всем авторизованным.',
  })
  @ApiOkResponse({
    description: 'Массив групп',
    schema: {
      example: [
        {
          id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          name: 'A',
          course: 1,
          groupName: 'A',
          curatorId: null,
          createdAt: '2026-02-21T16:00:00.000Z',
          updatedAt: '2026-02-21T16:00:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  list() {
    return this.groupsService.list();
  }

  @Get(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Получить группу по ID (admin)' })
  @ApiParam({ name: 'id', description: 'ID группы', format: 'uuid' })
  @ApiOkResponse({
    description: 'Группа',
    schema: {
      example: {
        id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
        name: 'A',
        course: 1,
        groupName: 'A',
        curatorId: null,
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Только admin' })
  @ApiNotFoundResponse({ description: 'Группа не найдена' })
  getById(@Param('id') id: string) {
    return this.groupsService.getById(id);
  }

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Создать группу (admin)' })
  @ApiCreatedResponse({
    description: 'Группа создана',
    schema: {
      example: {
        id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
        name: 'A',
        course: 1,
        groupName: 'A',
        curatorId: null,
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Невалидные данные или группа с таким курсом и буквой уже есть',
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Только admin может создавать группы' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Обновить группу (admin)' })
  @ApiParam({ name: 'id', description: 'ID группы', format: 'uuid' })
  @ApiOkResponse({
    description: 'Группа обновлена',
    schema: {
      example: {
        id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
        name: 'B',
        course: 1,
        groupName: 'B',
        curatorId: null,
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:05:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Невалидные данные или группа с таким курсом и буквой уже есть',
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Только admin' })
  @ApiNotFoundResponse({ description: 'Группа не найдена' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Удалить группу (admin)' })
  @ApiParam({ name: 'id', description: 'ID группы', format: 'uuid' })
  @ApiOkResponse({
    description: 'Группа удалена',
    schema: { example: { id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488' } },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Только admin' })
  @ApiNotFoundResponse({ description: 'Группа не найдена' })
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}
