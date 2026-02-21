import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { hashToken } from '../common/utils/token.util';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  private readonly accessTtlMinutes: number;
  private readonly refreshTtlDays: number;
  private readonly tokenPepper: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.accessTtlMinutes =
      configService.get<number>('auth.accessTtlMinutes') ?? 15;
    this.refreshTtlDays =
      configService.get<number>('auth.refreshTtlDays') ?? 30;
    this.tokenPepper = configService.getOrThrow<string>('auth.tokenPepper');
  }

  async login(dto: LoginDto, ctx: SessionContext = {}) {
    const login = dto.login.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { login },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(this.prisma, user, ctx, null);

    return {
      ...tokens,
      user: this.buildPublicUser(user),
    };
  }

  async refresh(dto: RefreshDto, ctx: SessionContext = {}) {
    const refreshHash = hashToken(dto.refreshToken, this.tokenPepper);

    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: refreshHash },
      include: { user: true },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt) {
      await this.revokeSessionChain(session.id, 'refresh_token_reuse');
      throw new UnauthorizedException('Refresh token was already rotated');
    }

    if (session.expiresAt <= new Date()) {
      await this.revokeSessionChain(session.id, 'refresh_token_expired');
      throw new UnauthorizedException('Refresh token expired');
    }

    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revocationReason: 'rotated',
        },
      });

      return this.issueTokenPair(tx, session.user, ctx, session.id);
    });

    return {
      ...tokens,
      user: this.buildPublicUser(session.user),
    };
  }

  async logout(dto: LogoutDto) {
    const refreshHash = hashToken(dto.refreshToken, this.tokenPepper);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: refreshHash },
    });

    if (!session) {
      return { success: true };
    }

    if (!session.revokedAt) {
      await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revocationReason: 'logout',
        },
      });
    }

    return { success: true };
  }

  private async issueTokenPair(
    tx: Prisma.TransactionClient | PrismaService,
    user: User,
    ctx: SessionContext,
    parentId: string | null,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const sessionId = randomUUID();
    const now = Date.now();
    const accessExpiresAt = new Date(now + this.accessTtlMinutes * 60 * 1000);
    const expiresAt = new Date(now + this.refreshTtlDays * 24 * 60 * 60 * 1000);
    const accessToken = this.generateOpaqueToken();
    const refreshToken = this.generateOpaqueToken();
    const accessTokenHash = hashToken(accessToken, this.tokenPepper);
    const refreshHash = hashToken(refreshToken, this.tokenPepper);

    await tx.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: refreshHash,
        accessTokenHash,
        accessExpiresAt,
        expiresAt,
        parentId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlMinutes * 60,
    };
  }

  private async revokeSessionChain(
    rootSessionId: string,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    const queue = [rootSessionId];

    while (queue.length > 0) {
      const batch = queue.splice(0, 100);

      await this.prisma.refreshSession.updateMany({
        where: {
          id: { in: batch },
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          revocationReason: reason,
        },
      });

      const children = await this.prisma.refreshSession.findMany({
        where: { parentId: { in: batch } },
        select: { id: true },
      });

      for (const child of children) {
        queue.push(child.id);
      }
    }
  }

  private buildPublicUser(user: User) {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      classRoomId: user.classRoomId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }
}

interface SessionContext {
  ip?: string;
  userAgent?: string;
}
