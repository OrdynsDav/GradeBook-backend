import 'dotenv/config';
import { PrismaClient, Role, ThemeMode, NotificationType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { DateTime } from 'luxon';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const MOSCOW_TZ = 'Europe/Moscow';
const DEFAULT_PASSWORD = 'Password123!';

const toUtcDate = (dayOffset: number, hour: number, minute = 0): Date => {
  return DateTime.now()
    .setZone(MOSCOW_TZ)
    .plus({ days: dayOffset })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toUTC()
    .toJSDate();
};

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await prisma.refreshSession.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.classRoom.deleteMany();

  const classA = await prisma.classRoom.create({
    data: { name: '10A', course: 10, groupName: 'A' },
  });
  const classB = await prisma.classRoom.create({
    data: { name: '10B', course: 10, groupName: 'B' },
  });

  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      passwordHash,
      role: Role.admin,
      firstName: 'System',
      lastName: 'Admin',
    },
  });

  const teacherMath = await prisma.user.create({
    data: {
      login: 'teacher.math',
      passwordHash,
      role: Role.teacher,
      firstName: 'Ivan',
      lastName: 'Petrov',
      middleName: 'Sergeevich',
    },
  });

  const teacherRus = await prisma.user.create({
    data: {
      login: 'teacher.rus',
      passwordHash,
      role: Role.teacher,
      firstName: 'Olga',
      lastName: 'Smirnova',
      middleName: 'Andreevna',
    },
  });

  const studentA = await prisma.user.create({
    data: {
      login: 'student.a',
      passwordHash,
      role: Role.student,
      classRoomId: classA.id,
      firstName: 'Nikita',
      lastName: 'Ivanov',
    },
  });

  const studentB = await prisma.user.create({
    data: {
      login: 'student.b',
      passwordHash,
      role: Role.student,
      classRoomId: classA.id,
      firstName: 'Maria',
      lastName: 'Sokolova',
    },
  });

  await prisma.userSettings.createMany({
    data: [admin, teacherMath, teacherRus, studentA, studentB].map((user) => ({
      userId: user.id,
      themeMode: ThemeMode.system,
    })),
  });

  const math10A = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      classRoomId: classA.id,
      teacherId: teacherMath.id,
    },
  });

  const rus10A = await prisma.subject.create({
    data: {
      name: 'Russian language',
      classRoomId: classA.id,
      teacherId: teacherRus.id,
    },
  });

  await prisma.subject.create({
    data: {
      name: 'Mathematics',
      classRoomId: classB.id,
      teacherId: teacherMath.id,
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        subjectId: math10A.id,
        classRoomId: classA.id,
        teacherId: teacherMath.id,
        startsAt: toUtcDate(0, 9, 0),
        endsAt: toUtcDate(0, 9, 45),
        room: '101',
      },
      {
        subjectId: rus10A.id,
        classRoomId: classA.id,
        teacherId: teacherRus.id,
        startsAt: toUtcDate(0, 10, 0),
        endsAt: toUtcDate(0, 10, 45),
        room: '104',
      },
      {
        subjectId: math10A.id,
        classRoomId: classA.id,
        teacherId: teacherMath.id,
        startsAt: toUtcDate(2, 11, 0),
        endsAt: toUtcDate(2, 11, 45),
        room: '101',
      },
    ],
  });

  await prisma.grade.createMany({
    data: [
      {
        subjectId: math10A.id,
        studentId: studentA.id,
        createdById: teacherMath.id,
        value: 5,
        comment: 'Great work',
        gradedAt: toUtcDate(-1, 12, 0),
      },
      {
        subjectId: math10A.id,
        studentId: studentB.id,
        createdById: teacherMath.id,
        value: 4,
        comment: 'Good progress',
        gradedAt: toUtcDate(-2, 12, 0),
      },
      {
        subjectId: rus10A.id,
        studentId: studentA.id,
        createdById: teacherRus.id,
        value: 5,
        comment: 'Excellent essay',
        gradedAt: toUtcDate(-3, 12, 0),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: studentA.id,
        title: 'New grade',
        body: 'You received grade 5 in Mathematics',
        type: NotificationType.grade,
      },
      {
        userId: studentA.id,
        title: 'Announcement',
        body: 'Classroom event this Friday',
        type: NotificationType.announcement,
      },
      {
        userId: teacherMath.id,
        title: 'Reminder',
        body: 'Submit weekly report',
        type: NotificationType.system,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete. Test users:');
  // eslint-disable-next-line no-console
  console.log(`admin / ${DEFAULT_PASSWORD} (admin)`);
  // eslint-disable-next-line no-console
  console.log(`teacher.math / ${DEFAULT_PASSWORD} (teacher)`);
  // eslint-disable-next-line no-console
  console.log(`teacher.rus / ${DEFAULT_PASSWORD} (teacher)`);
  // eslint-disable-next-line no-console
  console.log(`student.a / ${DEFAULT_PASSWORD} (student)`);
  // eslint-disable-next-line no-console
  console.log(`student.b / ${DEFAULT_PASSWORD} (student)`);
}

main()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
