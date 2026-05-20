export interface UserProfile {
  personal_id: string;
  full_name: string;
  role: string;
  team_number: string | null;
  gender?: 'male' | 'female';
}

export interface Cadet {
  cadet_id: string;
  full_name: string;
  personal_id: string;
  team_number: string;
  phone_number: string;
  birth_date: string;
  role: string;
  specific_role?: string;
  gender?: 'male' | 'female';
}

export interface AttendanceLog {
  log_id: string;
  event_id: string;
  cadet_id: string;
  status: boolean;
  absence_reason: string;
  notes: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string;
}
