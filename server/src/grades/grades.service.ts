import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/security/interfaces/authenticated-user.interface';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async updateGrade(
    gradeId: string,
    dto: UpdateGradeDto,
    user: AuthenticatedUser,
  ) {
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, deletedAt: null },
      include: { subject: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    this.assertCanManageGrade(user, grade.subject.teacherId);

    return this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        value: dto.value,
        comment: dto.comment,
        gradedAt: dto.gradedAt ? new Date(dto.gradedAt) : undefined,
      },
    });
  }

  async deleteGrade(gradeId: string, user: AuthenticatedUser) {
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, deletedAt: null },
      include: { subject: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    this.assertCanManageGrade(user, grade.subject.teacherId);

    return this.prisma.grade.update({
      where: { id: gradeId },
      data: { deletedAt: new Date() },
    });
  }

  private assertCanManageGrade(
    user: AuthenticatedUser,
    subjectTeacherId: string,
  ): void {
    if (user.role === Role.admin) {
      return;
    }

    if (user.role === Role.teacher && user.sub === subjectTeacherId) {
      return;
    }

    throw new ForbiddenException('You cannot manage this grade');
  }
}
