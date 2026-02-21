import { ThemeMode } from '@prisma/client';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const prismaMock = {
    userSettings: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettingsService(prismaMock as never);
  });

  it('merges settings updates without losing existing values', () => {
    const current = {
      id: 'settings-1',
      userId: 'user-1',
      themeMode: ThemeMode.system,
      notificationsEnabled: true,
      notificationsGrades: true,
      notificationsHomework: true,
      notificationsAnnouncements: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const merged = service.mergeSettings(current as never, {
      themeMode: ThemeMode.dark,
      notifications: {
        grades: false,
      },
    });

    expect(merged).toEqual({
      themeMode: ThemeMode.dark,
      notificationsEnabled: true,
      notificationsGrades: false,
      notificationsHomework: true,
      notificationsAnnouncements: true,
    });
  });

  it('updates persisted settings and returns mapped response', async () => {
    prismaMock.userSettings.upsert.mockResolvedValue({
      id: 'settings-1',
      userId: 'user-1',
      themeMode: ThemeMode.system,
      notificationsEnabled: true,
      notificationsGrades: true,
      notificationsHomework: true,
      notificationsAnnouncements: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.userSettings.update.mockResolvedValue({
      id: 'settings-1',
      userId: 'user-1',
      themeMode: ThemeMode.light,
      notificationsEnabled: false,
      notificationsGrades: false,
      notificationsHomework: true,
      notificationsAnnouncements: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateSettings('user-1', {
      themeMode: ThemeMode.light,
      notifications: {
        enabled: false,
        grades: false,
      },
    });

    expect(prismaMock.userSettings.update).toHaveBeenCalled();
    expect(result.themeMode).toBe(ThemeMode.light);
    expect(result.notifications.enabled).toBe(false);
    expect(result.notifications.grades).toBe(false);
    expect(result.notifications.homework).toBe(true);
    expect(result.notifications.announcements).toBe(true);
  });
});
