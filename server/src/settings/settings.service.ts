import { Injectable } from '@nestjs/common';
import { Prisma, ThemeMode, UserSettings } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const settings = await this.ensureSettings(userId);
    return this.toResponse(settings);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const current = await this.ensureSettings(userId);
    const merged = this.mergeSettings(current, dto);

    const updated = await this.prisma.userSettings.update({
      where: { userId },
      data: merged,
    });

    return this.toResponse(updated);
  }

  mergeSettings(
    current: UserSettings,
    dto: UpdateSettingsDto,
  ): Prisma.UserSettingsUpdateInput {
    return {
      themeMode: dto.themeMode ?? current.themeMode,
      notificationsEnabled:
        dto.notifications?.enabled ?? current.notificationsEnabled,
      notificationsGrades:
        dto.notifications?.grades ?? current.notificationsGrades,
      notificationsHomework:
        dto.notifications?.homework ?? current.notificationsHomework,
      notificationsAnnouncements:
        dto.notifications?.announcements ?? current.notificationsAnnouncements,
    };
  }

  private async ensureSettings(userId: string): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        themeMode: ThemeMode.system,
      },
      update: {},
    });
  }

  private toResponse(settings: UserSettings) {
    return {
      themeMode: settings.themeMode,
      notifications: {
        enabled: settings.notificationsEnabled,
        grades: settings.notificationsGrades,
        homework: settings.notificationsHomework,
        announcements: settings.notificationsAnnouncements,
      },
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
