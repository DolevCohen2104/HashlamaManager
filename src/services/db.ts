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

export const upsertAttendance = async (log: Omit<AttendanceLog, 'log_id' | 'updated_at'>, existingLogId?: string) => {
  const payload = {
    ...log,
    updated_at: new Date().toISOString()
  };

  if (existingLogId) {
    const { error } = await supabase
      .from('attendance_logs')
      .update(payload)
      .eq('log_id', existingLogId);
    if (error) handleSupabaseError(error, 'upsertAttendance (update)');
  } else {
    const { error } = await supabase
      .from('attendance_logs')
      .insert(payload);
    if (error) handleSupabaseError(error, 'upsertAttendance (insert)');
  }
};

// Tasks
export const fetchTasks = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    handleSupabaseError(error, 'fetchTasks');
    return [];
  }
  return data || [];
};

export const fetchTaskCompletions = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*');

  if (error) {
    handleSupabaseError(error, 'fetchTaskCompletions');
    return [];
  }
  return data || [];
};

export const completeTask = async (taskId: string, cadetId: string) => {
  const { error } = await supabase
    .from('task_completions')
    .insert({ task_id: taskId, cadet_id: cadetId });
  if (error) handleSupabaseError(error, 'completeTask');
};

export const createTask = async (task: any) => {
  const { error } = await supabase
    .from('tasks')
    .insert(task);
  if (error) handleSupabaseError(error, 'createTask');
};

// Service Requests
export const fetchServiceRequests = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    handleSupabaseError(error, 'fetchServiceRequests');
    return [];
  }
  return data || [];
};

export const submitServiceRequest = async (request: any) => {
  const { error } = await supabase
    .from('service_requests')
    .insert(request);
  if (error) handleSupabaseError(error, 'submitServiceRequest');
};
