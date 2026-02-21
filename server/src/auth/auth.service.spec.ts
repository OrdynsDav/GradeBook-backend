import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { hashToken } from '../common/utils/token.util';

describe('AuthService', () => {
  const configMap: Record<string, unknown> = {
    'auth.accessTtlMinutes': 15,
    'auth.refreshTtlDays': 30,
    'auth.tokenPepper': 'test_token_pepper_123456',
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    refreshSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => configMap[key]),
    get: jest.fn((key: string) => configMap[key]),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prismaMock as never, configServiceMock as never);
  });

  it('logs in and returns token pair', async () => {
    const password = 'Password123!';
    const user = {
      id: 'user-1',
      login: 'student.a',
      passwordHash: await bcrypt.hash(password, 4),
      role: 'student',
      firstName: 'Ivan',
      lastName: 'Petrov',
      middleName: null,
      classRoomId: 'class-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.refreshSession.create.mockResolvedValue({ id: 'session-1' });

    const result = await service.login({
      login: user.login,
      password,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.login).toBe(user.login);
    expect(prismaMock.refreshSession.create).toHaveBeenCalledTimes(1);
  });

  it('refreshes token and rotates refresh session', async () => {
    const refreshToken = 'old-refresh-token';
    const user = {
      id: 'user-1',
      login: 'student.a',
      passwordHash: 'hash',
      role: 'student',
      firstName: 'Ivan',
      lastName: 'Petrov',
      middleName: null,
      classRoomId: 'class-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.refreshSession.findUnique.mockResolvedValue({
      id: 'old-session',
      userId: user.id,
      tokenHash: hashToken(
        refreshToken,
        configMap['auth.tokenPepper'] as string,
      ),
      expiresAt: new Date(Date.now() + 60_000),
      accessExpiresAt: new Date(Date.now() + 30_000),
      revokedAt: null,
      user,
    });

    const txMock = {
      refreshSession: {
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    );

    const result = await service.refresh({ refreshToken });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(txMock.refreshSession.update).toHaveBeenCalled();
    expect(txMock.refreshSession.create).toHaveBeenCalled();
  });

  it('logs out and revokes current refresh session', async () => {
    const refreshToken = 'logout-refresh-token';
    prismaMock.refreshSession.findUnique.mockResolvedValue({
      id: 'logout-session',
      tokenHash: hashToken(
        refreshToken,
        configMap['auth.tokenPepper'] as string,
      ),
      revokedAt: null,
    });
    prismaMock.refreshSession.update.mockResolvedValue({});

    const result = await service.logout({ refreshToken });

    expect(result).toEqual({ success: true });
    expect(prismaMock.refreshSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'logout-session' },
      }),
    );
  });
});
