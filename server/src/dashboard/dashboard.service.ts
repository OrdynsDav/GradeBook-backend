import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { MOSCOW_TIME_ZONE } from '../common/utils/date-time.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  private sanitizeSubjectName(name: string): string {
    // Remove curriculum prefixes like "УПп.01" from API responses.
    return name
      .replace(/^\s*(?:[Уу][Пп][Пп]\.?\s*\d+(?:\.\d+)?\s*[-:)]?\s*)+/u, '')
      .trim();
  }

  async getDashboard(user: AuthenticatedUser) {
    const nowMoscow = DateTime.now().setZone(MOSCOW_TIME_ZONE);
    const dayStartUtc = nowMoscow.startOf('day').toUTC().toJSDate();
    const dayEndUtc = nowMoscow.endOf('day').toUTC().toJSDate();

    const [averageGrade, lessonsToday, unreadNotifications, todaySchedule] =
      await Promise.all([
        this.getAverageGrade(user),
        this.getLessonsToday(user, dayStartUtc, dayEndUtc),
        this.prisma.notification.count({
          where: { userId: user.sub, status: 'unread' },
        }),
        this.getTodaySchedule(user, dayStartUtc, dayEndUtc),
      ]);

    const normalizedSchedule = todaySchedule.map((lesson) => ({
      ...lesson,
      subject: {
        ...lesson.subject,
        name: this.sanitizeSubjectName(lesson.subject.name),
      },
    }));

    return {
      averageGrade,
      lessonsToday,
      unreadNotifications,
      todaySchedule: normalizedSchedule,
    };
  }

  private async getAverageGrade(
    user: AuthenticatedUser,
  ): Promise<number | null> {
    if (user.role === Role.student) {
      const result = await this.prisma.grade.aggregate({
        where: { studentId: user.sub, deletedAt: null },
        _avg: { value: true },
      });
      return result._avg.value;
    }

    if (user.role === Role.teacher) {
      const result = await this.prisma.grade.aggregate({
        where: {
          deletedAt: null,
          subject: { teacherId: user.sub },
        },
        _avg: { value: true },
      });
      return result._avg.value;
    }

    const result = await this.prisma.grade.aggregate({
      where: { deletedAt: null },
      _avg: { value: true },
    });

    return result._avg.value;
  }

  private async getLessonsToday(
    user: AuthenticatedUser,
    dayStartUtc: Date,
    dayEndUtc: Date,
  ) {
    if (user.role === Role.student) {
      const student = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.sub },
        select: { groupId: true },
      });

      return this.prisma.lesson.count({
        where: {
          groupId: student.groupId ?? undefined,
          startsAt: { gte: dayStartUtc, lte: dayEndUtc },
        },
      });
    }

    if (user.role === Role.teacher) {
      return this.prisma.lesson.count({
        where: {
          teacherId: user.sub,
          startsAt: { gte: dayStartUtc, lte: dayEndUtc },
        },
      });
    }

    return this.prisma.lesson.count({
      where: {
        startsAt: { gte: dayStartUtc, lte: dayEndUtc },
      },
    });
  }

  private async getTodaySchedule(
    user: AuthenticatedUser,
    dayStartUtc: Date,
    dayEndUtc: Date,
  ) {
    if (user.role === Role.student) {
      const student = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.sub },
        select: { groupId: true },
      });

      return this.prisma.lesson.findMany({
        where: {
          groupId: student.groupId ?? undefined,
          startsAt: { gte: dayStartUtc, lte: dayEndUtc },
        },
        include: {
          subject: { select: { id: true, name: true } },
        },
        take: 5,
        orderBy: { startsAt: 'asc' },
      });
    }

    if (user.role === Role.teacher) {
      return this.prisma.lesson.findMany({
        where: {
          teacherId: user.sub,
          startsAt: { gte: dayStartUtc, lte: dayEndUtc },
        },
        include: {
          subject: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
        },
        take: 5,
        orderBy: { startsAt: 'asc' },
      });
    }

    return this.prisma.lesson.findMany({
      where: {
        startsAt: { gte: dayStartUtc, lte: dayEndUtc },
      },
      include: {
        subject: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
      take: 5,
      orderBy: { startsAt: 'asc' },
    });
  }
}
