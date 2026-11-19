// Thomas's 9-line rotating roster, taken from "Roster_Calculator Gateshead" (9-Line Roster sheet).
//
// How it works:
// - A roster runs for 9 weeks. Every week starts on a Saturday.
// - You say which line you start on (1 to 9) and the Saturday the roster starts.
// - Week 1 uses your start line, week 2 the next line, and so on, wrapping from 9 back to 1.

export type ShiftKind = 'day' | 'night';
export type RosterDay = { kind: 'off' } | { kind: ShiftKind; start: string; end: string };

const D: RosterDay = { kind: 'day', start: '06:45', end: '19:00' };
const D_SUN: RosterDay = { kind: 'day', start: '07:00', end: '19:00' };
const N: RosterDay = { kind: 'night', start: '18:45', end: '07:00' };
const N_SUN: RosterDay = { kind: 'night', start: '19:00', end: '07:00' };
const O: RosterDay = { kind: 'off' };

// Columns are Saturday to Friday. Night shifts end at 07:00 the next morning.
export const LINES: Record<number, RosterDay[]> = {
  //   SAT   SUN    MON  TUE  WED  THU  FRI
  1: [D, D_SUN, N, N, O, O, O],
  2: [O, O, D, D, N, N, O],
  3: [O, O, O, O, D, D, N],
  4: [N, O, O, O, O, O, D],
  5: [D, N_SUN, N, O, O, O, O],
  6: [O, D_SUN, D, N, N, O, O],
  7: [O, O, O, D, D, N, N],
  8: [O, O, O, O, O, D, D],
  9: [N, N_SUN, O, O, O, O, O],
};

export const ROSTER_WEEKS = 9;

export type Shift = {
  date: string; // YYYY-MM-DD the shift starts on
  line: number;
  kind: ShiftKind;
  start: string; // local time HH:MM
  end: string; // local time HH:MM, on the next day for night shifts
  endsNextDay: boolean;
};

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

function isSaturday(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 6;
}

// Lists every working shift in a roster that starts on `startDate` (a Saturday) on `startLine`.
export function buildRoster(startLine: number, startDate: string, weeks = ROSTER_WEEKS): Shift[] {
  if (!Number.isInteger(startLine) || startLine < 1 || startLine > 9) throw new Error('Start line must be 1 to 9.');
  if (!isSaturday(startDate)) throw new Error('A roster always starts on a Saturday.');

  const shifts: Shift[] = [];
  for (let week = 0; week < weeks; week++) {
    const line = ((startLine - 1 + week) % 9) + 1;
    LINES[line].forEach((day, i) => {
      if (day.kind === 'off') return;
      shifts.push({
        date: addDays(startDate, week * 7 + i),
        line,
        kind: day.kind,
        start: day.start,
        end: day.end,
        endsNextDay: day.kind === 'night',
      });
    });
  }
  return shifts;
}

// Calendar rule: shifts are titled "Work – <location>" and also get an all-day event.
export function shiftTitle(location: string): string {
  return `Work – ${location}`;
}
