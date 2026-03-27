import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DateTime } from 'luxon';
import * as XLSX from 'xlsx';
import { PrismaService } from '../common/prisma/prisma.service';
import { MOSCOW_TIME_ZONE } from '../common/utils/date-time.util';

export interface RawLessonRow {
  dateStr: string;
  timeStartStr: string;
  timeEndStr: string;
  groupName: string;
  subjectName: string;
  teacherName: string;
  room?: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

/** Нормализует ФИО преподавателя из ячейки ("Филиппова О.С." / "Кротова К.Б.") для сопоставления с БД */
function normalizeTeacherName(cell: string): { lastName: string; initials: string } | null {
  const s = String(cell ?? '').trim();
  if (!s) return null;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const lastName = parts[0].trim();
  const initials = parts
    .slice(1)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();
  return { lastName, initials };
}

function normalizeSubjectName(name: string): string {
  return name
    .replace(/^\s*(?:[Уу][Пп][Пп]\.?\s*\d+(?:\.\d+)?\s*[-:)]?\s*)+/u, '')
    .trim();
}

/** Парсит дату из ячейки: "Вторник 24.02.2026г." или "24.02.2026" */
function parseDateFromCell(cell: unknown): string | null {
  const s = String(cell ?? '').trim();
  if (!s) return null;
  const match = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Парсит время из ячейки: "8:15 - 9:45" или "8:15 – 9:45" или "8:15-9:45" */
function parseTimeRangeFromCell(cell: unknown): { start: string; end: string } | null {
  const s = String(cell ?? '').trim();
  const match = s.match(/(\d{1,2})\s*:\s*(\d{2})\s*[-–]\s*(\d{1,2})\s*:\s*(\d{2})/);
  if (!match) return null;
  const [, h1, m1, h2, m2] = match;
  return {
    start: `${h1.padStart(2, '0')}:${m1}`,
    end: `${h2.padStart(2, '0')}:${m2}`,
  };
}

@Injectable()
export class ScheduleImportService {
  constructor(private readonly prisma: PrismaService) { }

  /** Ячейка похожа на метку (Предмет/Преподаватель/Кабинет/Столбец и т.д.), а не на название группы */
  private static isLabelCell(s: string): boolean {
    const lower = s.toLowerCase();
    return (
      lower.includes('предмет') ||
      lower.includes('преподаватель') ||
      lower.includes('кабинет') ||
      lower.includes('столбец') ||
      lower.includes('день недели') ||
      lower.includes('№ занятия') ||
      lower.includes('время') ||
      lower === 'название' ||
      s.length > 40
    );
  }

  /** Собирает из строки названия групп (колонки D+, не метки) */
  private static collectGroupNamesFromRow(row: unknown[]): string[] {
    const names: string[] = [];
    for (let c = 3; c < (row?.length ?? 0); c++) {
      const val = row[c];
      if (val == null) continue;
      const name = String(val).trim();
      if (!name || ScheduleImportService.isLabelCell(name)) continue;
      names.push(name);
    }
    return names;
  }

  /**
   * Парсит один лист: ищет строку с группами (D+) и блоки по 3 строки (Предмет, Преподаватель, Кабинет).
   */
  private parseSheet(rows: unknown[][]): RawLessonRow[] {
    const result: RawLessonRow[] = [];
    let subjectRowIndex = -1;
    const maxScan = Math.min(rows.length, 40);

    for (let r = 0; r < maxScan; r++) {
      const row = rows[r] as unknown[];
      const cellC = row?.[2] != null ? String(row[2]).trim() : '';
      const cellB = row?.[1] != null ? String(row[1]).trim() : '';
      if (cellC === 'Предмет' || cellB === 'Предмет') {
        subjectRowIndex = r;
        break;
      }
    }

    let groupNames: string[] = [];
    if (subjectRowIndex >= 0) {
      for (let hr = 0; hr < subjectRowIndex; hr++) {
        const cand = ScheduleImportService.collectGroupNamesFromRow(rows[hr] as unknown[]);
        if (cand.length > groupNames.length) groupNames = cand;
      }
      if (groupNames.length === 0 && subjectRowIndex > 0) {
        groupNames = ScheduleImportService.collectGroupNamesFromRow(
          rows[subjectRowIndex - 1] as unknown[],
        );
      }
    }
    if (groupNames.length === 0) {
      for (let r = 0; r < Math.min(rows.length, 15); r++) {
        const cand = ScheduleImportService.collectGroupNamesFromRow(rows[r] as unknown[]);
        if (cand.length > groupNames.length) groupNames = cand;
      }
    }
    if (groupNames.length === 0) return result;

    let currentDate: string | null = null;
    let currentTime: { start: string; end: string } | null = null;
    const dataStart = subjectRowIndex >= 0 ? subjectRowIndex : 0;

    for (let r = dataStart; r < rows.length - 2; r++) {
      const row1 = rows[r] as unknown[];
      const row2 = rows[r + 1] as unknown[];
      const row3 = rows[r + 2] as unknown[];
      const c1 = row1?.[2] != null ? String(row1[2]).trim() : (row1?.[1] != null ? String(row1[1]).trim() : '');
      const c2 = row2?.[2] != null ? String(row2[2]).trim() : (row2?.[1] != null ? String(row2[1]).trim() : '');
      const c3 = row3?.[2] != null ? String(row3[2]).trim() : (row3?.[1] != null ? String(row3[1]).trim() : '');

      if (c1 === 'Предмет' && c2 === 'Преподаватель' && c3 === 'Кабинет') {
        const dateFromA = parseDateFromCell(row1?.[0] ?? row1?.[1]);
        if (dateFromA) currentDate = dateFromA;
        const timeFromB = parseTimeRangeFromCell(row1?.[1] ?? row1?.[0]);
        if (timeFromB) currentTime = timeFromB;
        if (!currentDate || !currentTime) continue;

        for (let col = 0; col < groupNames.length; col++) {
          const groupName = groupNames[col];
          const subjectCell = row1?.[3 + col];
          const teacherCell = row2?.[3 + col];
          const roomCell = row3?.[3 + col];
          const subjectName = subjectCell != null ? String(subjectCell).trim() : '';
          const teacherName = teacherCell != null ? String(teacherCell).trim() : '';
          const room = roomCell != null ? String(roomCell).trim() : undefined;
          if (subjectName && teacherName) {
            result.push({
              dateStr: currentDate,
              timeStartStr: currentTime.start,
              timeEndStr: currentTime.end,
              groupName,
              subjectName,
              teacherName,
              room: room || undefined,
            });
          }
        }
        r += 2;
      }
    }
    return result;
  }

  /**
   * Парсит все листы Excel (до 4 страниц). Ожидаемая структура на каждом листе:
   * заголовок с названиями групп в колонках D+; блоки по 3 строки (Предмет, Преподаватель, Кабинет); в A — дата, в B — время.
   */
  parseExcelBuffer(buffer: Buffer): RawLessonRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheetNames = workbook.SheetNames ?? [];
    if (sheetNames.length === 0) {
      throw new BadRequestException('Excel file has no sheets');
    }

    const allRows: RawLessonRow[] = [];
    const sheetsToProcess = sheetNames.slice(0, 4);

    for (const sheetName of sheetsToProcess) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });
      const sheetLessons = this.parseSheet(rows);
      allRows.push(...sheetLessons);
    }

    if (allRows.length === 0) {
      throw new BadRequestException(
        'Could not find schedule data. Expected on each sheet: a row with group names in columns D onwards, then blocks of 3 rows with "Предмет", "Преподаватель", "Кабинет" in column B or C.',
      );
    }
    return allRows;
  }

  /** Сопоставляет группу по имени (name или groupName, без учёта регистра). */
  private async resolveGroup(groupName: string) {
    const normalized = groupName.trim().toUpperCase();
    const group = await this.prisma.group.findFirst({
      where: {
        OR: [
          { name: { equals: normalized, mode: 'insensitive' } },
          { groupName: { equals: normalized, mode: 'insensitive' } },
        ],
      },
    });
    return group;
  }

  /** Сопоставляет учителя по строке типа "Филиппова О.С." (фамилия + инициалы). */
  private async resolveTeacher(teacherName: string) {
    const parsed = normalizeTeacherName(teacherName);
    if (!parsed) return null;
    const teachers = await this.prisma.user.findMany({
      where: { role: Role.teacher },
      select: {
        id: true,
        lastName: true,
        firstName: true,
        middleName: true,
      },
    });
    for (const t of teachers) {
      const lastMatch =
        t.lastName.trim().toLowerCase() === parsed.lastName.toLowerCase();
      const fi = (t.firstName?.trim().charAt(0) ?? '').toUpperCase();
      const mi = (t.middleName?.trim().charAt(0) ?? '').toUpperCase();
      const initialsMatch =
        parsed.initials === '' ||
        (parsed.initials.length >= 1 && fi === parsed.initials[0] &&
          (parsed.initials.length < 2 || mi === parsed.initials[1]));
      if (lastMatch && initialsMatch) return t.id;
    }
    return null;
  }

  /** Находит или создаёт предмет (name + groupId + teacherId). */
  private async resolveOrCreateSubject(
    subjectName: string,
    groupId: string,
    teacherId: string,
  ) {
    const name = normalizeSubjectName(subjectName);
    if (!name) return null;
    let subject = await this.prisma.subject.findUnique({
      where: {
        name_groupId: { name, groupId },
      },
    });
    if (subject) {
      if (subject.teacherId !== teacherId) {
        await this.prisma.subject.update({
          where: { id: subject.id },
          data: { teacherId },
        });
        subject = { ...subject, teacherId };
      }
      return subject.id;
    }
    const created = await this.prisma.subject.create({
      data: { name, groupId, teacherId },
    });
    return created.id;
  }

  /** Строит ISO даты начала/конца в Москве и возвращает UTC Date. */
  private toUtcDates(
    dateStr: string,
    timeStartStr: string,
    timeEndStr: string,
  ): { startsAt: Date; endsAt: Date } {
    const start = DateTime.fromISO(`${dateStr}T${timeStartStr}:00`, {
      zone: MOSCOW_TIME_ZONE,
    });
    const end = DateTime.fromISO(`${dateStr}T${timeEndStr}:00`, {
      zone: MOSCOW_TIME_ZONE,
    });
    if (!start.isValid || !end.isValid) {
      throw new BadRequestException(
        `Invalid date/time: ${dateStr} ${timeStartStr}-${timeEndStr}`,
      );
    }
    return {
      startsAt: start.toUTC().toJSDate(),
      endsAt: end.toUTC().toJSDate(),
    };
  }

  async importFromExcel(buffer: Buffer): Promise<ImportResult> {
    const rows = this.parseExcelBuffer(buffer);
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const group = await this.resolveGroup(row.groupName);
        if (!group) {
          result.errors.push(
            `Group not found: "${row.groupName}" (${row.dateStr} ${row.timeStartStr} ${row.subjectName})`,
          );
          result.skipped++;
          continue;
        }
        const teacherId = await this.resolveTeacher(row.teacherName);
        if (!teacherId) {
          result.errors.push(
            `Teacher not found: "${row.teacherName}" (${row.dateStr} ${row.subjectName})`,
          );
          result.skipped++;
          continue;
        }
        const subjectId = await this.resolveOrCreateSubject(
          row.subjectName,
          group.id,
          teacherId,
        );
        if (!subjectId) {
          result.skipped++;
          continue;
        }
        const { startsAt, endsAt } = this.toUtcDates(
          row.dateStr,
          row.timeStartStr,
          row.timeEndStr,
        );

        const existing = await this.prisma.lesson.findFirst({
          where: {
            groupId: group.id,
            startsAt,
            endsAt,
          },
        });
        if (existing) {
          result.skipped++;
          continue;
        }

        await this.prisma.lesson.create({
          data: {
            subjectId,
            groupId: group.id,
            teacherId,
            startsAt,
            endsAt,
            room: row.room ?? null,
          },
        });
        result.created++;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : String(e);
        result.errors.push(
          `Row ${row.groupName} ${row.dateStr} ${row.subjectName}: ${msg}`,
        );
        result.skipped++;
      }
    }

    return result;
  }
}
