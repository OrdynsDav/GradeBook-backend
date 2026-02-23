import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/security/decorators/roles.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
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
          name: '1A',
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

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Создать группу (admin)' })
  @ApiCreatedResponse({
    description: 'Группа создана',
    schema: {
      example: {
        id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
        name: '1A',
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
}
