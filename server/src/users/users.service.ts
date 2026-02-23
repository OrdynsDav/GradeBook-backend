import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateUserByAdminDto,
  CreatableRole,
} from './dto/create-user-by-admin.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        group: true,
      },
    });

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      group: user.group
        ? {
            id: user.group.id,
            name: user.group.name,
            course: user.group.course,
            groupName: user.group.groupName,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName:
          dto.middleName !== undefined
            ? dto.middleName.length > 0
              ? dto.middleName
              : null
            : undefined,
      },
      include: {
        group: true,
      },
    });

    return {
      id: updatedUser.id,
      login: updatedUser.login,
      role: updatedUser.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      middleName: updatedUser.middleName,
      group: updatedUser.group
        ? {
            id: updatedUser.group.id,
            name: updatedUser.group.name,
            course: updatedUser.group.course,
            groupName: updatedUser.group.groupName,
          }
        : null,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async createByAdmin(dto: CreateUserByAdminDto) {
    const login = dto.login.trim().toLowerCase();
    const role =
      dto.role === CreatableRole.student ? Role.student : Role.teacher;
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const middleName = dto.middleName?.trim() ? dto.middleName.trim() : null;
    const groupNameOrCode = dto.group?.trim().toUpperCase();
    const existingByLogin = await this.prisma.user.findUnique({
      where: { login },
    });
    if (existingByLogin) {
      throw new ConflictException('User with this login already exists');
    }

    const existingByFullName = await this.prisma.user.findFirst({
      where: {
        firstName,
        lastName,
        middleName,
      },
    });
    if (existingByFullName) {
      throw new ConflictException(
        'User with this first name, last name and middle name already exists',
      );
    }

    let groupId: string | undefined;
    if (role === Role.student) {
      if (dto.course === undefined || !groupNameOrCode) {
        throw new BadRequestException(
          'course and group are required for student',
        );
      }

      const groupRecord = await this.prisma.group.upsert({
        where: {
          course_groupName: {
            course: dto.course,
            groupName: groupNameOrCode,
          },
        },
        create: {
          course: dto.course,
          groupName: groupNameOrCode,
          name: groupNameOrCode,
        },
        update: {},
      });
      groupId = groupRecord.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        login,
        passwordHash,
        role,
        firstName,
        lastName,
        middleName,
        groupId,
      },
      include: {
        group: true,
      },
    });

    await this.prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    });

    if (role === Role.teacher && dto.subjects?.length) {
      for (const item of dto.subjects) {
        const name = item.name.trim();
        let groupIdsToUse: string[] | null = null;
        if (item.groups?.length) {
          const normalized = [
            ...new Set(item.groups.map((g) => g.trim().toUpperCase())),
          ].filter(Boolean);
          if (!normalized.length) {
            throw new BadRequestException(
              'groups must contain at least one non-empty name.',
            );
          }
          const found = await this.prisma.group.findMany({
            where: { name: { in: normalized } },
            select: { id: true, name: true },
          });
          const foundNames = new Set(found.map((g) => g.name));
          const missing = normalized.filter((n) => !foundNames.has(n));
          if (missing.length) {
            throw new BadRequestException(
              `Groups not found by name: ${missing.join(', ')}. Create them (POST /groups) or use groupId/groupIds.`,
            );
          }
          groupIdsToUse = found.map((g) => g.id);
        } else if (
          item.groupIds?.length !== undefined &&
          item.groupIds!.length > 0
        ) {
          groupIdsToUse = item.groupIds!;
        } else if (item.groupId) {
          groupIdsToUse = [item.groupId];
        }
        if (!groupIdsToUse?.length) {
          throw new BadRequestException(
            'Each subject must have groupId, non-empty groupIds, or non-empty groups (group names).',
          );
        }
        for (const gid of groupIdsToUse) {
          const group = await this.prisma.group.findUnique({
            where: { id: gid },
          });
          if (!group) {
            throw new BadRequestException(
              `Group not found: ${gid}. Create the group first (POST /groups) or use a valid id.`,
            );
          }
          try {
            await this.prisma.subject.create({
              data: {
                name,
                groupId: gid,
                teacherId: user.id,
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
      }
    }

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      group: user.group
        ? {
            id: user.group.id,
            name: user.group.name,
            course: user.group.course,
            groupName: user.group.groupName,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
