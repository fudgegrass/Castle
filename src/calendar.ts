import { googleGet } from './google';

const API = 'https://www.googleapis.com/calendar/v3';

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  calendarName: string;
  color: string;
  link?: string;
};

type CalendarListEntry = { id: string; summary: string; summaryOverride?: string; backgroundColor?: string; selected?: boolean; primary?: boolean };
type ApiEvent = {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};

// Parses an all-day date (YYYY-MM-DD) as local midnight, not UTC.
function localDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

// Loads events from every calendar you have ticked in Google Calendar, between two times.
export async function loadEvents(token: string, from: Date, to: Date): Promise<CalEvent[]> {
  const list = await googleGet<{ items: CalendarListEntry[] }>(`${API}/users/me/calendarList?minAccessRole=reader`, token);
  const calendars = list.items.filter((c) => c.selected || c.primary);

  const perCalendar = await Promise.all(
    calendars.map(async (cal) => {
      const params = new URLSearchParams({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });
      const data = await googleGet<{ items: ApiEvent[] }>(
        `${API}/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        token,
      );
      return data.items
        .filter((e) => e.status !== 'cancelled')
        .map<CalEvent>((e) => {
          const allDay = !e.start.dateTime;
          return {
            id: `${cal.id}:${e.id}`,
            title: e.summary || '(No title)',
            start: allDay ? localDate(e.start.date!) : new Date(e.start.dateTime!),
            end: allDay ? localDate(e.end.date!) : new Date(e.end.dateTime!),
            allDay,
            location: e.location,
            calendarName: cal.summaryOverride || cal.summary,
            color: cal.backgroundColor || '#7a2e2e',
            link: e.htmlLink,
          };
        });
    }),
  );

  return perCalendar.flat().sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());
}

export function startOfDay(d: Date, addDays = 0): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + addDays);
}

// Events that overlap a given day.
export function eventsOn(events: CalEvent[], day: Date): CalEvent[] {
  const from = startOfDay(day);
  const to = startOfDay(day, 1);
  return events.filter((e) => e.start < to && e.end > from);
}
