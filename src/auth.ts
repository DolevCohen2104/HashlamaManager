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

export const checkUserStatus = async (personalId: string): Promise<{ exists: boolean, hasPin: boolean }> => {
  const cleanId = personalId.trim();
  const { data, error } = await supabase
    .from('cadets')
    .select('personal_id, pin_code')
    .eq('personal_id', cleanId)
    .maybeSingle();

  if (error || !data) {
    return { exists: false, hasPin: false };
  }
  return { exists: true, hasPin: !!data.pin_code };
};

export const setPinCode = async (personalId: string, pin: string): Promise<AppUser> => {
  const cleanId = personalId.trim();
  const { error: updateError } = await supabase
    .from('cadets')
    .update({ pin_code: pin })
    .eq('personal_id', cleanId);

  if (updateError) {
    throw new Error('שגיאה בשמירת הקוד הסודי');
  }

  return await loginWithPin(personalId, pin);
};

export const loginWithPin = async (personalId: string, pin?: string, bypassPinCheck = false): Promise<AppUser> => {
  const cleanId = personalId.trim();
  const { data: cadetData, error: cadetError } = await supabase
    .from('cadets')
    .select('personal_id, role, full_name, team_number, pin_code')
    .eq('personal_id', cleanId)
    .single();

  if (cadetError || !cadetData) {
    console.error('Sign in error:', cadetError);
    throw new Error('שגיאה בהתחברות: מספר אישי לא מזוהה במערכת');
  }

  if (!bypassPinCheck && cadetData.pin_code && cadetData.pin_code !== pin) {
    throw new Error('קוד סודי שגוי');
  }

  const user: AppUser = {
    personal_id: cadetData.personal_id,
    role: cadetData.role || 'צוער',
    specific_role: cadetData.role,
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
