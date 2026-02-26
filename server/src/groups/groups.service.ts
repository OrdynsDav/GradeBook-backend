import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        course: true,
        groupName: true,
        curatorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async list() {
    return this.prisma.group.findMany({
      orderBy: [{ course: 'asc' }, { groupName: 'asc' }],
      select: {
        id: true,
        name: true,
        course: true,
        groupName: true,
        curatorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreateGroupDto) {
    const course = dto.course;
    const groupName = dto.groupName.trim().toUpperCase();
    const name = groupName;
    try {
      return await this.prisma.group.create({
        data: {
          name,
          course,
          groupName,
        },
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : '';
      if (code === 'P2002') {
        throw new BadRequestException(
          `Group with course ${course} and groupName "${groupName}" already exists.`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateGroupDto) {
    const existing = await this.prisma.group.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Group not found');
    }

    const course = dto.course ?? existing.course;
    const groupNameRaw = dto.groupName !== undefined ? dto.groupName.trim().toUpperCase() : existing.groupName;
    const name = groupNameRaw;

    try {
      return await this.prisma.group.update({
        where: { id },
        data: {
          ...(dto.course !== undefined && { course }),
          ...(dto.groupName !== undefined && { groupName: groupNameRaw, name }),
        },
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : '';
      if (code === 'P2002') {
        throw new BadRequestException(
          `Group with course ${course} and groupName "${groupNameRaw}" already exists.`,
        );
      }
      throw err;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.group.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Group not found');
    }
    await this.prisma.group.delete({ where: { id } });
    return { id };
  }
}
