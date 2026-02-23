import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/security/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';

const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT_LIMIT ?? 10);
const AUTH_RATE_TTL = Number(process.env.AUTH_RATE_LIMIT_TTL_MS ?? 60_000);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ auth: { limit: AUTH_RATE_LIMIT, ttl: AUTH_RATE_TTL } })
  @ApiOperation({
    summary: 'Вход в систему',
    description:
      'Аутентифицирует пользователя и возвращает access/refresh токены',
  })
  @ApiOkResponse({
    description: 'Успешный вход',
    schema: {
      example: {
        accessToken: '<opaque_access_token>',
        refreshToken: '<opaque_refresh_token>',
        expiresIn: 900,
        user: {
          id: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
          login: 'student.a',
          role: 'student',
          firstName: 'Nikita',
          lastName: 'Ivanov',
          middleName: null,
          groupId: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          createdAt: '2026-02-21T16:00:00.000Z',
          updatedAt: '2026-02-21T16:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Невалидные входные данные' })
  @ApiUnauthorizedResponse({ description: 'Неверный логин или пароль' })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.extractContext(request));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ auth: { limit: AUTH_RATE_LIMIT, ttl: AUTH_RATE_TTL } })
  @ApiOperation({
    summary: 'Обновление токенов',
    description:
      'Выполняет refresh token rotation: выдает новую пару токенов и инвалидирует предыдущий refresh токен',
  })
  @ApiOkResponse({
    description: 'Токены обновлены',
    schema: {
      example: {
        accessToken: '<new_opaque_access_token>',
        refreshToken: '<new_opaque_refresh_token>',
        expiresIn: 900,
        user: {
          id: 'b4ea8b53-23ab-4f67-bf8f-58f1635b8f7a',
          login: 'student.a',
          role: 'student',
          firstName: 'Nikita',
          lastName: 'Ivanov',
          middleName: null,
          groupId: 'e2f08ca8-6866-4df6-8d43-1c2f4d8f4488',
          createdAt: '2026-02-21T16:00:00.000Z',
          updatedAt: '2026-02-21T16:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Невалидный refresh token payload' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token недействителен или просрочен',
  })
  refresh(@Body() dto: RefreshDto, @Req() request: Request) {
    return this.authService.refresh(dto, this.extractContext(request));
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @Throttle({ auth: { limit: AUTH_RATE_LIMIT, ttl: AUTH_RATE_TTL } })
  @ApiOperation({
    summary: 'Выход из системы',
    description: 'Ревокирует текущую refresh-сессию',
  })
  @ApiOkResponse({
    description: 'Сессия успешно завершена',
    schema: { example: { success: true } },
  })
  @ApiBadRequestResponse({ description: 'Невалидные входные данные' })
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  private extractContext(request: Request): {
    ip?: string;
    userAgent?: string;
  } {
    return {
      ip: request.ip,
      userAgent: request.header('user-agent'),
    };
  }
}
