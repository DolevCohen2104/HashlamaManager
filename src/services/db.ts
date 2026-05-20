import { supabase } from '../supabase';
import type { UserProfile, Cadet, AttendanceLog } from '../types';

const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, error);
  throw new Error(`שגיאה בפעולת מסד נתונים: ${error.message}`);
};

// Users table was removed, auth is handled in auth.ts

// Cadets
export const fetchCadets = async (): Promise<Cadet[]> => {
  const { data, error } = await supabase
    .from('cadets')
    .select('*')
    .order('team_number', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) {
    handleSupabaseError(error, 'fetchCadets');
    return [];
  }
  return data as Cadet[];
};

export const addCadet = async (cadet: Omit<Cadet, 'cadet_id'>) => {
  const { error } = await supabase
    .from('cadets')
    .insert(cadet);

  if (error) handleSupabaseError(error, 'addCadet');
};

export const deleteCadet = async (id: string) => {
  const { error } = await supabase
    .from('cadets')
    .delete()
    .eq('cadet_id', id);

  if (error) handleSupabaseError(error, 'deleteCadet');
};

// Attendance
export const fetchAttendanceForEvent = async (eventId: string): Promise<AttendanceLog[]> => {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('event_id', eventId);

  if (error) {
    handleSupabaseError(error, 'fetchAttendanceForEvent');
    return [];
  }
  return data as AttendanceLog[];
};

export const upsertAttendance = async (log: Omit<AttendanceLog, 'log_id'>, _existingId?: string) => {
  // Use Supabase native upsert with onConflict so it always works,
  // even if we only have a temp log_id in local state.
  const { error } = await supabase
    .from('attendance_logs')
    .upsert(
      { ...log, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,cadet_id' }
    );
  if (error) handleSupabaseError(error, 'upsertAttendance');
};

