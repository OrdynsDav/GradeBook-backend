import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SubjectsQueryDto } from './dto/subjects-query.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    const [group, teacher] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: dto.groupId } }),
      this.prisma.user.findFirst({
        where: { id: dto.teacherId, role: Role.teacher },
      }),
    ]);
    if (!group) {
      throw new BadRequestException(
        `Group not found: ${dto.groupId}. Create the group first (POST /groups).`,
      );
    }
    if (!teacher) {
      throw new BadRequestException(
        `Teacher not found or not a teacher: ${dto.teacherId}.`,
      );
    }
    const name = dto.name.trim();
    try {
      return await this.prisma.subject.create({
        data: {
          name,
          groupId: dto.groupId,
          teacherId: dto.teacherId,
        },
        include: {
          group: { select: { id: true, name: true } },
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
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : '';
      if (code === 'P2002') {
        throw new BadRequestException(
          `Subject "${name}" already exists in group ${group.name}. Use another name or group.`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: { group: { select: { name: true } } },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    const name = dto.name !== undefined ? dto.name.trim() : subject.name;
    const groupId = dto.groupId ?? subject.groupId;
    const teacherId = dto.teacherId ?? subject.teacherId;

    if (dto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new BadRequestException(`Group not found: ${dto.groupId}`);
      }
    }
    if (dto.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: dto.teacherId, role: Role.teacher },
      });
      if (!teacher) {
        throw new BadRequestException(
          `Teacher not found or not a teacher: ${dto.teacherId}`,
        );
      }
    }

    try {
      return await this.prisma.subject.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name }),
          ...(dto.groupId !== undefined && { groupId }),
          ...(dto.teacherId !== undefined && { teacherId }),
        },
        include: {
          group: { select: { id: true, name: true } },
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
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : '';
      if (code === 'P2002') {
        throw new BadRequestException(
          `Subject "${name}" already exists in this group. Use another name or group.`,
        );
      }
      throw err;
    }
  }

  async remove(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    await this.prisma.subject.delete({
      where: { id },
    });
    return { id };
  }

  async getById(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true } },
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
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }

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
