import { supabase } from '../supabase';
import type { UserProfile, Cadet, AttendanceLog } from '../types';

const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, error);
  throw new Error(`שגיאה בפעולת מסד נתונים: ${error.message}`);
};

// User Profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    handleSupabaseError(error, 'getUserProfile');
  }
  
  if (!data) return null;
  return data as UserProfile;
};

export const createUserProfile = async (uid: string, profile: Omit<UserProfile, 'id'>) => {
  const { error } = await supabase
    .from('users')
    .insert({ id: uid, ...profile });

  if (error) handleSupabaseError(error, 'createUserProfile');
};

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

export const addCadet = async (cadet: Omit<Cadet, 'id'>) => {
  const { error } = await supabase
    .from('cadets')
    .insert(cadet);

  if (error) handleSupabaseError(error, 'addCadet');
};

export const deleteCadet = async (id: string) => {
  const { error } = await supabase
    .from('cadets')
    .delete()
    .eq('id', id);

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

export const upsertAttendance = async (log: Omit<AttendanceLog, 'id'>, existingId?: string) => {
  if (existingId) {
    const { error } = await supabase
      .from('attendance_logs')
      .update({ ...log, updated_at: new Date().toISOString() })
      .eq('id', existingId);
    if (error) handleSupabaseError(error, 'upsertAttendance (update)');
  } else {
    const { error } = await supabase
      .from('attendance_logs')
      .insert({ ...log, updated_at: new Date().toISOString() });
    if (error) handleSupabaseError(error, 'upsertAttendance (insert)');
  }
};
