import { supabase } from './supabase';

export interface AppUser {
  personal_id: string;
  role: 'maham' | 'mammash' | 'rohav';
  full_name: string;
  team_number: string | null;
}

export const initAuth = (
  onAuthSuccess?: (user: AppUser) => void,
  onAuthFailure?: () => void
) => {
  const stored = localStorage.getItem('hashlama_user');
  if (stored) {
    try {
      const user = JSON.parse(stored) as AppUser;
      if (onAuthSuccess) onAuthSuccess(user);
    } catch (e) {
      if (onAuthFailure) onAuthFailure();
    }
  } else {
    if (onAuthFailure) onAuthFailure();
  }

  return () => {};
};

export const signInWithPersonalId = async (personalId: string): Promise<AppUser | null> => {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('personal_id, role')
    .eq('personal_id', personalId)
    .single();

  if (userError || !userData) {
    console.error('Sign in error:', userError);
    throw new Error('שגיאה בהתחברות: מספר אישי לא מזוהה במערכת מורשי הגישה');
  }

  const { data: cadetData } = await supabase
    .from('cadets')
    .select('full_name, team_number')
    .eq('personal_id', personalId)
    .single();

  const user: AppUser = {
    personal_id: userData.personal_id,
    role: userData.role,
    full_name: cadetData?.full_name || 'משתמש מערכת',
    team_number: cadetData?.team_number?.toString() || null,
  };

  localStorage.setItem('hashlama_user', JSON.stringify(user));
  return user;
};

export const logout = async () => {
  localStorage.removeItem('hashlama_user');
  window.location.reload();
};
