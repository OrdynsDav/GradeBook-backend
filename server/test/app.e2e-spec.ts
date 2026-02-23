/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { execSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DateTime } from 'luxon';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('GradeBook API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let groupId: string;
  let subjectId: string;
  let studentId: string;
  let teacherId: string;
  let weekDate: string;
  const password = 'Password123!';
  const studentLogin = 'e2e.student';
  const teacherLogin = 'e2e.teacher';
  const adminLogin = 'e2e.admin';

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  beforeAll(async () => {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await prepareData();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('denies unauthorized access to protected endpoint', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('login -> me flow works', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        login: studentLogin,
        password,
      })
      .expect(200);

    const accessToken = loginResponse.body.accessToken as string;
    expect(accessToken).toBeDefined();

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set(authHeader(accessToken))
      .expect(200);

    expect(meResponse.body.login).toBe(studentLogin);
    expect(meResponse.body.role).toBe(Role.student);
  });

  it('refresh token rotation invalidates previous token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        login: studentLogin,
        password,
      })
      .expect(200);

    const oldRefreshToken = loginResponse.body.refreshToken as string;

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(200);

    expect(refreshed.body.refreshToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
  });

  it('enforces role-protected grade endpoint', async () => {
    const studentTokens = await login(studentLogin);
    const teacherTokens = await login(teacherLogin);

    await request(app.getHttpServer())
      .post(`/api/v1/subjects/${subjectId}/grades`)
      .set(authHeader(studentTokens.accessToken))
      .send({
        studentId,
        value: 4,
        comment: 'Should be forbidden',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/subjects/${subjectId}/grades`)
      .set(authHeader(teacherTokens.accessToken))
      .send({
        studentId,
        value: 5,
        comment: 'Teacher can create grade',
      })
      .expect(201);
  });

  it('returns schedule week for student', async () => {
    const studentTokens = await login(studentLogin);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/schedule/week?date=${weekDate}`)
      .set(authHeader(studentTokens.accessToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('supports notifications pagination and read endpoints', async () => {
    const studentTokens = await login(studentLogin);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications?status=all&page=1&limit=1')
      .set(authHeader(studentTokens.accessToken))
      .expect(200);

    expect(listResponse.body.items.length).toBe(1);
    expect(listResponse.body.total).toBeGreaterThanOrEqual(2);

    const notificationId = listResponse.body.items[0].id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set(authHeader(studentTokens.accessToken))
      .expect(200);

    const readAllResponse = await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set(authHeader(studentTokens.accessToken))
      .expect(200);

    expect(readAllResponse.body.updated).toBeGreaterThanOrEqual(0);
  });

  it('allows admin to register users and manage schedule', async () => {
    const adminTokens = await login(adminLogin);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(authHeader(adminTokens.accessToken))
      .send({
        role: Role.student,
        firstName: 'New',
        lastName: 'Student',
        middleName: 'A',
        course: 10,
        group: 'A',
        login: 'e2e.new.student',
        password,
      })
      .expect(201);

    const lessonDate = DateTime.now()
      .setZone('Europe/Moscow')
      .plus({ days: 1 });
    const startsAt = lessonDate
      .set({ hour: 11, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toISO();
    const endsAt = lessonDate
      .set({ hour: 11, minute: 45, second: 0, millisecond: 0 })
      .toUTC()
      .toISO();

    if (!startsAt || !endsAt) {
      throw new Error('Failed to build lesson dates');
    }

    const createdLesson = await request(app.getHttpServer())
      .post('/api/v1/schedule')
      .set(authHeader(adminTokens.accessToken))
      .send({
        subjectId,
        startsAt,
        endsAt,
        room: 'E2E-202',
      })
      .expect(201);

    const lessonId = createdLesson.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/schedule/${lessonId}`)
      .set(authHeader(adminTokens.accessToken))
      .send({ room: 'E2E-203' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/schedule/${lessonId}`)
      .set(authHeader(adminTokens.accessToken))
      .expect(200);
  });

  async function login(loginValue: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ login: loginValue, password })
      .expect(200);

    return {
      accessToken: response.body.accessToken as string,
      refreshToken: response.body.refreshToken as string,
    };
  }

  async function prepareData() {
    const passwordHash = await bcrypt.hash(password, 6);
    await prisma.refreshSession.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.grade.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
    await prisma.group.deleteMany();

    const group = await prisma.group.create({
      data: { name: 'A', course: 1, groupName: 'A' },
    });
    groupId = group.id;

    const teacher = await prisma.user.create({
      data: {
        login: teacherLogin,
        passwordHash,
        role: Role.teacher,
        firstName: 'Teacher',
        lastName: 'Primary',
      },
    });
    teacherId = teacher.id;

    await prisma.user.create({
      data: {
        login: adminLogin,
        passwordHash,
        role: Role.admin,
        firstName: 'Admin',
        lastName: 'Primary',
      },
    });

    const student = await prisma.user.create({
      data: {
        login: studentLogin,
        passwordHash,
        role: Role.student,
        groupId,
        firstName: 'Student',
        lastName: 'Primary',
      },
    });
    studentId = student.id;

    const subject = await prisma.subject.create({
      data: {
        name: 'E2E Math',
        groupId,
        teacherId,
      },
    });
    subjectId = subject.id;

    const lessonDate = DateTime.now().setZone('Europe/Moscow');
    weekDate = lessonDate.toFormat('yyyy-MM-dd');
    const startsAt = lessonDate
      .set({ hour: 9, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toJSDate();
    const endsAt = lessonDate
      .set({ hour: 9, minute: 45, second: 0, millisecond: 0 })
      .toUTC()
      .toJSDate();

    await prisma.lesson.create({
      data: {
        subjectId,
        groupId,
        teacherId,
        startsAt,
        endsAt,
        room: 'E2E-101',
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          userId: studentId,
          title: 'E2E unread 1',
          body: 'First unread notification',
          type: 'system',
        },
        {
          userId: studentId,
          title: 'E2E unread 2',
          body: 'Second unread notification',
          type: 'announcement',
        },
      ],
    });

    await prisma.userSettings.createMany({
      data: [{ userId: teacherId }, { userId: studentId }],
    });
  }
});
