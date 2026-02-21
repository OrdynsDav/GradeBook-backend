import { Body, Controller, Delete, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradesService } from './grades.service';

@ApiTags('grades')
@ApiBearerAuth()
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Patch(':id')
  @Roles(Role.teacher, Role.admin)
  @ApiOperation({ summary: 'Обновить оценку (teacher/admin)' })
  @ApiParam({ name: 'id', description: 'ID оценки', format: 'uuid' })
  @ApiOkResponse({
    description: 'Оценка обновлена',
    schema: {
      example: {
        id: '7f52a18b-1d86-4689-bc6d-e6f6c4bff4eb',
        value: 4,
        comment: 'Updated comment',
        gradedAt: '2026-02-21T08:00:00.000Z',
        updatedAt: '2026-02-21T09:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Невалидный payload' })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  @ApiNotFoundResponse({ description: 'Оценка не найдена' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gradesService.updateGrade(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.teacher, Role.admin)
  @ApiOperation({ summary: 'Удалить оценку (soft delete, teacher/admin)' })
  @ApiParam({ name: 'id', description: 'ID оценки', format: 'uuid' })
  @ApiOkResponse({
    description: 'Оценка помечена как удаленная',
    schema: {
      example: {
        id: '7f52a18b-1d86-4689-bc6d-e6f6c4bff4eb',
        deletedAt: '2026-02-21T09:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Требуется access token' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  @ApiNotFoundResponse({ description: 'Оценка не найдена' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.gradesService.deleteGrade(id, user);
  }
}
