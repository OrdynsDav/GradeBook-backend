import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  getMoscowDayRangeUtc,
  getMoscowWeekRangeUtc,
} from '../common/utils/date-time.util';
import { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async createLesson(dto: CreateLessonDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.ensureValidLessonBounds(startsAt, endsAt);

    const lesson = await this.prisma.lesson.create({
      data: {
        subjectId: subject.id,
        groupId: subject.groupId,
        teacherId: subject.teacherId,
        startsAt,
        endsAt,
        room: dto.room,
      },
      include: {
        subject: { select: { id: true, name: true } },
        group: {
          select: { id: true, name: true, course: true, groupName: true },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    });

    return this.toLessonResponse(lesson);
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto) {
    const existing = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!existing) {
      throw new NotFoundException('Lesson not found');
    }

    let subjectId = existing.subjectId;
    let groupId = existing.groupId;
    let teacherId = existing.teacherId;

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) {
        throw new NotFoundException('Subject not found');
      }
      subjectId = subject.id;
      groupId = subject.groupId;
      teacherId = subject.teacherId;
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    this.ensureValidLessonBounds(startsAt, endsAt);

    const lesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        subjectId,
        groupId,
        teacherId,
        startsAt,
        endsAt,
        room: dto.room,
      },
      include: {
        subject: { select: { id: true, name: true } },
        group: {
          select: { id: true, name: true, course: true, groupName: true },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    });

    return this.toLessonResponse(lesson);
  }

  async deleteLesson(lessonId: string) {
    const existing = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!existing) {
      throw new NotFoundException('Lesson not found');
    }

    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { success: true };
  }

  async getWeek(user: AuthenticatedUser, query: ScheduleQueryDto) {
    const range = getMoscowWeekRangeUtc(query.date);
    return this.findLessons(user, query, range.startUtc, range.endUtc);
  }

  async getDay(user: AuthenticatedUser, query: ScheduleQueryDto) {
    const range = getMoscowDayRangeUtc(query.date);
    return this.findLessons(user, query, range.startUtc, range.endUtc);
  }

  private async findLessons(
    user: AuthenticatedUser,
    query: ScheduleQueryDto,
    startUtc: Date,
    endUtc: Date,
  ) {
    const where = await this.buildWhereClause(user, query, startUtc, endUtc);

    const lessons = await this.prisma.lesson.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        group: {
          select: { id: true, name: true, course: true, groupName: true },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return lessons.map((lesson) => this.toLessonResponse(lesson));
  }

  private async buildWhereClause(
    user: AuthenticatedUser,
    query: ScheduleQueryDto,
    startUtc: Date,
    endUtc: Date,
  ) {
    const where: {
      startsAt: { gte: Date; lte: Date };
      groupId?: string;
      teacherId?: string;
    } = {
      startsAt: { gte: startUtc, lte: endUtc },
    };

    if (user.role === Role.student) {
      const student = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.sub },
        select: { groupId: true },
      });

      if (!student.groupId) {
        throw new ForbiddenException('Student is not assigned to a group');
      }

      where.groupId = student.groupId;
      return where;
    }

    if (user.role === Role.teacher) {
      if (query.teacherId && query.teacherId !== user.sub) {
        throw new ForbiddenException(
          'Teachers can view only their own schedule',
        );
      }

      where.teacherId = user.sub;
      if (query.groupId) {
        where.groupId = query.groupId;
      }
      return where;
    }

    if (query.groupId) {
      where.groupId = query.groupId;
    }
    if (query.teacherId) {
      where.teacherId = query.teacherId;
    }

    return where;
  }

  private ensureValidLessonBounds(startsAt: Date, endsAt: Date): void {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid startsAt or endsAt');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be greater than startsAt');
    }
  }

  private toLessonResponse(lesson: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    room: string | null;
    subject: { id: string; name: string };
    group: { id: string; name: string; course: number; groupName: string };
    teacher: {
      id: string;
      firstName: string;
      lastName: string;
      middleName: string | null;
    };
  }) {
    return {
      id: lesson.id,
      startsAt: lesson.startsAt,
      endsAt: lesson.endsAt,
      room: lesson.room,
      subject: lesson.subject,
      group: lesson.group,
      teacher: lesson.teacher,
    };
  }
}
