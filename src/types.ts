export type Role = 'maham' | 'mammash' | 'rohav';

export interface UserProfile {
  id: string; // The uid
  personal_id: string;
  full_name: string;
  role: Role;
  team_number: string; // "1"-"8", only required if role is mammash
}

export interface Cadet {
  id: string;
  full_name: string;
  personal_id: string;
  team_number: string;
  phone_number: string;
  birth_date: string;
  specific_role: string;
}

export interface AttendanceLog {
  id: string;
  event_id: string;
  cadet_id: string;
  status: boolean;
  absence_reason: string;
  notes: string;
  updated_at: string;
  updated_by: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string;
}
