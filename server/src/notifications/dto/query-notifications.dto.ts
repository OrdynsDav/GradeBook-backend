import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum NotificationFilterStatus {
  all = 'all',
  read = 'read',
  unread = 'unread',
}

export class QueryNotificationsDto {
  @ApiPropertyOptional({
    enum: NotificationFilterStatus,
    example: NotificationFilterStatus.unread,
    description: 'Фильтр по статусу уведомлений',
  })
  @IsOptional()
  @IsEnum(NotificationFilterStatus)
  status?: NotificationFilterStatus = NotificationFilterStatus.all;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Номер страницы',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    description: 'Лимит элементов на странице',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
