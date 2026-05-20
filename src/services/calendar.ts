import type { CalendarEvent } from '../types';

export const fetchTodayEvents = async (): Promise<CalendarEvent[]> => {
  const calendarId = import.meta.env.VITE_SHARED_CALENDAR_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;

  if (!calendarId || !apiKey) {
    throw new Error("MISSING_CONFIG");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('key', apiKey);
  url.searchParams.append('timeMin', startOfDay.toISOString());
  url.searchParams.append('timeMax', endOfDay.toISOString());
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`שגיאה בטעינת היומן: ${response.statusText}. יש לוודא שהיומן מוגדר כפומבי ומפתח ה-API תקין.`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((item: any) => ({
    id: item.id,
    summary: item.summary || 'No Title',
    start: item.start.dateTime || item.start.date,
    end: item.end.dateTime || item.end.date,
    location: item.location || 'No Location'
  }));
};
