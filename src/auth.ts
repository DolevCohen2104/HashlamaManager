import { supabase } from './supabase';

export interface AppUser {
  personal_id: string;
  role: string;
  specific_role?: string;
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
  const cleanId = personalId.trim();
  const { data: cadetData, error: cadetError } = await supabase
    .from('cadets')
    .select('personal_id, role, specific_role, full_name, team_number')
    .eq('personal_id', cleanId)
    .single();

  if (cadetError || !cadetData) {
    console.error('Sign in error:', cadetError);
    throw new Error('שגיאה בהתחברות: מספר אישי לא מזוהה במערכת');
  }

  const user: AppUser = {
    personal_id: cadetData.personal_id,
    role: cadetData.role || 'צוער',
    specific_role: cadetData.specific_role,
    full_name: cadetData.full_name || 'משתמש מערכת',
    team_number: cadetData.team_number?.toString() || null,
  };

  localStorage.setItem('hashlama_user', JSON.stringify(user));
  return user;
};

export const logout = async () => {
  localStorage.removeItem('hashlama_user');
  window.location.reload();
};
