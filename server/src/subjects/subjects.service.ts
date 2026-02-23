import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { SubjectsQueryDto } from './dto/subjects-query.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, query: SubjectsQueryDto) {
    const where = await this.buildSubjectsWhere(user, query);

    return this.prisma.subject.findMany({
      where,
      include: {
        group: {
          select: { id: true, name: true },
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
      orderBy: { name: 'asc' },
    });
  }

  async getGrades(subjectId: string, user: AuthenticatedUser) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const where = await this.buildGradesWhereForRole(subjectId, subject, user);

    return this.prisma.grade.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
      orderBy: [{ gradedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getStats(subjectId: string, user: AuthenticatedUser) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const where = await this.buildGradesWhereForRole(subjectId, subject, user);
    const aggregate = await this.prisma.grade.aggregate({
      where,
      _avg: { value: true },
      _count: { _all: true },
      _max: { value: true },
      _min: { value: true },
    });

    return {
      subjectId,
      count: aggregate._count._all,
      average: aggregate._avg.value,
      min: aggregate._min.value,
      max: aggregate._max.value,
    };
  }

  async createGrade(
    subjectId: string,
    dto: CreateGradeDto,
    user: AuthenticatedUser,
  ) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (
      user.role !== Role.admin &&
      !(user.role === Role.teacher && user.sub === subject.teacherId)
    ) {
      throw new ForbiddenException('You cannot add grades for this subject');
    }

    const student = await this.prisma.user.findFirst({
      where: {
        id: dto.studentId,
        role: Role.student,
        groupId: subject.groupId,
      },
    });

    if (!student) {
      throw new NotFoundException(
        'Student not found in this group for the selected subject',
      );
    }

    const grade = await this.prisma.$transaction(async (tx) => {
      const created = await tx.grade.create({
        data: {
          subjectId: subject.id,
          studentId: student.id,
          createdById: user.sub,
          value: dto.value,
          comment: dto.comment,
          gradedAt: dto.gradedAt ? new Date(dto.gradedAt) : new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: student.id,
          title: `New grade in ${subject.name}`,
          body: `You received grade ${dto.value}${dto.comment ? `: ${dto.comment}` : ''}`,
          type: NotificationType.grade,
        },
      });

      return created;
    });

    return grade;
  }

  private async buildSubjectsWhere(
    user: AuthenticatedUser,
    query: SubjectsQueryDto,
  ) {
    if (user.role === Role.student) {
      const student = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.sub },
        select: { groupId: true },
      });

      if (!student.groupId) {
        throw new ForbiddenException('Student has no group assigned');
      }

      return { groupId: student.groupId };
    }

    if (user.role === Role.teacher) {
      return {
        teacherId: user.sub,
        groupId: query.groupId,
      };
    }

    return {
      groupId: query.groupId,
      teacherId: query.teacherId,
    };
  }

  private async buildGradesWhereForRole(
    subjectId: string,
    subject: { groupId: string; teacherId: string },
    user: AuthenticatedUser,
  ) {
    if (user.role === Role.admin) {
      return { subjectId, deletedAt: null };
    }

    if (user.role === Role.teacher) {
      if (subject.teacherId !== user.sub) {
        throw new ForbiddenException('You cannot view grades for this subject');
      }
      return { subjectId, deletedAt: null };
    }

    const student = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
      select: { groupId: true },
    });

    if (student.groupId !== subject.groupId) {
      throw new ForbiddenException('You cannot view this subject grades');
    }

    return { subjectId, deletedAt: null, studentId: user.sub };
  }
}
