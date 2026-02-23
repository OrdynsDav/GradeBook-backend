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
          name: `${dto.course}${groupNameOrCode}`,
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
        const groupIdsToUse =
          item.groupIds?.length !== undefined && item.groupIds!.length > 0
            ? item.groupIds!
            : item.groupId
              ? [item.groupId]
              : null;
        if (!groupIdsToUse?.length) {
          throw new BadRequestException(
            'Each subject must have either groupId or non-empty groupIds.',
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
