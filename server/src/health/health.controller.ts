import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/security/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Проверка состояния сервиса' })
  @ApiOkResponse({
    description: 'Сервис и БД доступны',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-02-21T16:20:00.000Z',
      },
    },
  })
  check() {
    return this.healthService.check();
  }
}
