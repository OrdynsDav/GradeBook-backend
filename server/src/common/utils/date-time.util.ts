import { DateTime } from 'luxon';
import { BadRequestException } from '@nestjs/common';

export const MOSCOW_TIME_ZONE = 'Europe/Moscow';

const DATE_FORMAT = 'yyyy-MM-dd';

export const parseDateToMoscowDateTime = (date: string): DateTime => {
  const parsed = DateTime.fromFormat(date, DATE_FORMAT, {
    zone: MOSCOW_TIME_ZONE,
  });

  if (!parsed.isValid) {
    throw new BadRequestException('date must be in YYYY-MM-DD format');
  }

  return parsed;
};

export const getMoscowDayRangeUtc = (
  date: string,
): {
  startUtc: Date;
  endUtc: Date;
} => {
  const parsed = parseDateToMoscowDateTime(date);
  return {
    startUtc: parsed.startOf('day').toUTC().toJSDate(),
    endUtc: parsed.endOf('day').toUTC().toJSDate(),
  };
};

export const getMoscowWeekRangeUtc = (
  date: string,
): {
  startUtc: Date;
  endUtc: Date;
} => {
  const parsed = parseDateToMoscowDateTime(date);
  const weekStart = parsed.startOf('week');
  const weekEnd = weekStart.plus({ days: 6 }).endOf('day');

  return {
    startUtc: weekStart.toUTC().toJSDate(),
    endUtc: weekEnd.toUTC().toJSDate(),
  };
};
