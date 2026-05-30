export interface UserProfile {
  personal_id: string;
  full_name: string;
  role: string;
  team_number: string | null;
  gender?: 'זכר' | 'נקבה';
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
  gender?: 'זכר' | 'נקבה';
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

export interface Task {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  target_type: 'individual' | 'team' | 'all';
  target_value: string | null;
  created_at: string;
  deadline: string | null;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  cadet_id: string;
  completed_at: string;
}

export interface ServiceRequest {
  id: string;
  cadet_id: string;
  type: 'maintenance' | 'leave' | 'clinic';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  details: any;
  created_at: string;
}
