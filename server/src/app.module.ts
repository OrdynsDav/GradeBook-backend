import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GradesModule } from './grades/grades.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AllExceptionsFilter } from './common/security/filters/all-exceptions.filter';
import { AccessTokenGuard } from './common/security/guards/access-token.guard';
import { RolesGuard } from './common/security/guards/roles.guard';
// import { RequestIdMiddleware } from './common/security/middleware/request-id.middleware';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { ScheduleModule } from './schedule/schedule.module';
import { SettingsModule } from './settings/settings.module';
import { SubjectsModule } from './subjects/subjects.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('nodeEnv');
        const isProduction = nodeEnv === 'production';

        return {
          pinoHttp: {
            level: process.env.LOG_LEVEL ?? 'info',
            redact: ['req.headers.authorization'],
            genReqId: (req) => {
              const headerRequestId = req.headers['x-request-id'];
              if (
                typeof headerRequestId === 'string' &&
                headerRequestId.length > 0
              ) {
                return headerRequestId;
              }
              return randomUUID();
            },
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    singleLine: true,
                  },
                },
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('rateLimit.ttlMs') ?? 60_000,
            limit: configService.get<number>('rateLimit.limit') ?? 100,
          },
          {
            name: 'auth',
            ttl: configService.get<number>('rateLimit.authTtlMs') ?? 60_000,
            limit: configService.get<number>('rateLimit.authLimit') ?? 10,
          },
        ],
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    SubjectsModule,
    GradesModule,
    ScheduleModule,
    NotificationsModule,
    SettingsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {
  // Временно убрал middleware - он блокирует роуты
  // configure(consumer: MiddlewareConsumer): void {
  //   consumer.apply(RequestIdMiddleware).forRoutes('*');
  // }
}
