import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../../utils/token.util';
import { IS_PUBLIC_KEY } from '../constants/security.constants';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly tokenPepper: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.tokenPepper = configService.getOrThrow<string>('auth.tokenPepper');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token is missing');
    }

    const accessToken = authorization.slice('Bearer '.length).trim();
    if (!accessToken) {
      throw new UnauthorizedException('Access token is missing');
    }

    const accessTokenHash = hashToken(accessToken, this.tokenPepper);
    const session = await this.prisma.refreshSession.findUnique({
      where: { accessTokenHash },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            login: true,
          },
        },
      },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid access token');
    }

    const now = new Date();
    if (
      session.revokedAt !== null ||
      session.accessExpiresAt <= now ||
      session.expiresAt <= now
    ) {
      throw new UnauthorizedException('Access token expired');
    }

    (request as Request & { user: AuthenticatedUser }).user = {
      sub: session.user.id,
      role: session.user.role,
      login: session.user.login,
    };

    return true;
  }
}
