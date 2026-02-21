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
        classRoom: true,
      },
    });

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      classRoom: user.classRoom
        ? {
            id: user.classRoom.id,
            name: user.classRoom.name,
            course: user.classRoom.course,
            groupName: user.classRoom.groupName,
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
        classRoom: true,
      },
    });

    return {
      id: updatedUser.id,
      login: updatedUser.login,
      role: updatedUser.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      middleName: updatedUser.middleName,
      classRoom: updatedUser.classRoom
        ? {
            id: updatedUser.classRoom.id,
            name: updatedUser.classRoom.name,
            course: updatedUser.classRoom.course,
            groupName: updatedUser.classRoom.groupName,
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
    const group = dto.group?.trim().toUpperCase();
    const existing = await this.prisma.user.findUnique({ where: { login } });
    if (existing) {
      throw new ConflictException('User with this login already exists');
    }

    let classRoomId: string | undefined;
    if (role === Role.student) {
      if (dto.course === undefined || !group) {
        throw new BadRequestException(
          'course and group are required for student',
        );
      }

      const classRoom = await this.prisma.classRoom.upsert({
        where: {
          course_groupName: {
            course: dto.course,
            groupName: group,
          },
        },
        create: {
          course: dto.course,
          groupName: group,
          name: `${dto.course}${group}`,
        },
        update: {},
      });
      classRoomId = classRoom.id;
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
        classRoomId,
      },
      include: {
        classRoom: true,
      },
    });

    await this.prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    });

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      classRoom: user.classRoom
        ? {
            id: user.classRoom.id,
            name: user.classRoom.name,
            course: user.classRoom.course,
            groupName: user.classRoom.groupName,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
