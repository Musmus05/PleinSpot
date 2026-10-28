import type { ScheduleDay, Station } from '../types/station';

type Slot = ScheduleDay['slots'][number];

export type OpeningState =
  | { closesAt: string; closingSoon: boolean; kind: 'open' }
  | { kind: 'open24' }
  | { automate: boolean; kind: 'closed'; opensAt: { dayOffset: number; time: string } | null }
  | { kind: 'automate' }
  | { kind: 'unknown' };

const WEEKDAY_INDEX: Record<string, number> = { Fri: 5, Mon: 1, Sat: 6, Sun: 7, Thu: 4, Tue: 2, Wed: 3 };
const MINUTES_PER_DAY = 24 * 60;

const parisClock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
  weekday: 'short',
});

/** Station hours are declared in French local time, whatever the visitor's timezone. */
export function getParisClock(now: Date) {
  const parts = Object.fromEntries(parisClock.formatToParts(now).map((part) => [part.type, part.value]));

  return {
    day: WEEKDAY_INDEX[parts.weekday] ?? 1,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isAllDaySlot(slot: Slot) {
  // The feed encodes "open around the clock" either as identical times (very often 01:00-01:00)
  // or as a full-day range.
  return slot.open === slot.close || (slot.open === '00:00' && (slot.close === '23:59' || slot.close === '24:00'));
}

export function getOpeningState(station: Station, now = new Date()): OpeningState {
  const { schedule } = station;
  const hasDeclaredHours = schedule.some((day) => day.closed || day.slots.length > 0);

  if (!hasDeclaredHours) {
    return station.automate24h ? { kind: 'automate' } : { kind: 'unknown' };
  }

  const { day, minutes } = getParisClock(now);
  const today = schedule.find((entry) => entry.day === day);
  const yesterday = schedule.find((entry) => entry.day === ((day + 5) % 7) + 1);

  if (today && !today.closed && today.slots.length === 0) {
    return station.automate24h ? { kind: 'automate' } : { kind: 'unknown' };
  }

  if (today && !today.closed) {
    if (today.slots.some(isAllDaySlot)) {
      return { kind: 'open24' };
    }

    for (const slot of today.slots) {
      const open = toMinutes(slot.open);
      const close = toMinutes(slot.close);
      const isOvernight = close < open;

      if (isOvernight ? minutes >= open : minutes >= open && minutes < close) {
        const remaining = isOvernight ? MINUTES_PER_DAY - minutes + close : close - minutes;

        return { closesAt: slot.close, closingSoon: remaining <= 60, kind: 'open' };
      }
    }
  }

  // A slot declared yesterday as "20:00-02:00" is still running after midnight.
  for (const slot of yesterday && !yesterday.closed ? yesterday.slots : []) {
    const close = toMinutes(slot.close);

    if (!isAllDaySlot(slot) && close < toMinutes(slot.open) && minutes < close) {
      return { closesAt: slot.close, closingSoon: close - minutes <= 60, kind: 'open' };
    }
  }

  const opensAt = findNextOpening(schedule, day, minutes);

  if (!opensAt && station.automate24h) {
    return { kind: 'automate' };
  }

  return { automate: station.automate24h, kind: 'closed', opensAt };
}

function findNextOpening(schedule: ScheduleDay[], today: number, minutes: number) {
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const day = ((today - 1 + dayOffset) % 7) + 1;
    const entry = schedule.find((candidate) => candidate.day === day);

    if (!entry || entry.closed) {
      continue;
    }

    const upcoming = [...entry.slots]
      .sort((left, right) => toMinutes(left.open) - toMinutes(right.open))
      .find((slot) => dayOffset > 0 || toMinutes(slot.open) > minutes);

    if (upcoming) {
      return { dayOffset, time: isAllDaySlot(upcoming) ? '00:00' : upcoming.open };
    }
  }

  return null;
}

export type WeekRow = {
  day: number;
  isToday: boolean;
  value: { kind: 'closed' } | { kind: 'allDay' } | { kind: 'unknown' } | { kind: 'slots'; slots: Slot[] };
};

export function getWeekRows(station: Station, now = new Date()): WeekRow[] {
  const { day: today } = getParisClock(now);

  return [1, 2, 3, 4, 5, 6, 7].map((day) => {
    const entry = station.schedule.find((candidate) => candidate.day === day);
    const isToday = day === today;

    if (!entry) {
      return { day, isToday, value: { kind: 'unknown' } };
    }

    if (entry.closed) {
      return { day, isToday, value: { kind: 'closed' } };
    }

    if (entry.slots.some(isAllDaySlot)) {
      return { day, isToday, value: { kind: 'allDay' } };
    }

    if (entry.slots.length === 0) {
      return { day, isToday, value: { kind: 'unknown' } };
    }

    return {
      day,
      isToday,
      value: {
        kind: 'slots',
        slots: [...entry.slots].sort((left, right) => toMinutes(left.open) - toMinutes(right.open)),
      },
    };
  });
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);

  return hours * 60 + minutes;
}
