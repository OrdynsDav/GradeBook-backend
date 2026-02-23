import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/security/decorators/current-user.decorator';
import { Roles } from '../common/security/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Список всех пользователей (admin)' })
  @ApiOkResponse({
    description: 'Массив пользователей (как в GET /users/me, без пароля)',
    schema: {
      example: [
        {
          id: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
          login: 'student.a',
          role: 'student',
          firstName: 'Nikita',
          lastName: 'Ivanov',
          middleName: null,
          group: { id: 'uuid', name: 'A', course: 1, groupName: 'A' },
          createdAt: '2026-02-21T16:00:00.000Z',
          updatedAt: '2026-02-21T16:00:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Только admin может получать список пользователей' })
  list() {
    return this.usersService.listForAdmin();
  }

  @Get('me')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiOkResponse({
    description: 'Профиль пользователя',
    schema: {
      example: {
        id: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
        login: 'student.a',
        role: 'student',
        firstName: 'Nikita',
        lastName: 'Ivanov',
        middleName: null,
        group: {
          id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          name: '10A',
        },
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Обновить профиль текущего пользователя' })
  @ApiOkResponse({
    description: 'Профиль успешно обновлен',
    schema: {
      example: {
        id: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
        login: 'student.a',
        role: 'student',
        firstName: 'Nikita',
        lastName: 'Ivanov',
        middleName: 'Petrovich',
        group: {
          id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          name: '10A',
        },
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:05:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Невалидный payload' })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Создать пользователя (admin)' })
  @ApiCreatedResponse({
    description: 'Пользователь создан',
    schema: {
      example: {
        id: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
        login: 'student.a',
        role: 'student',
        firstName: 'Nikita',
        lastName: 'Ivanov',
        middleName: 'Petrovich',
        group: {
          id: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          name: '2A',
          course: 2,
          groupName: 'A',
        },
        createdAt: '2026-02-21T16:00:00.000Z',
        updatedAt: '2026-02-21T16:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Невалидный payload' })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({
    description: 'Только admin может создавать пользователей',
  })
  @ApiConflictResponse({ description: 'Логин уже занят' })
  createByAdmin(@Body() dto: CreateUserByAdminDto) {
    return this.usersService.createByAdmin(dto);
  }
}
