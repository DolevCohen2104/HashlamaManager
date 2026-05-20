import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AppUser {
  personal_id: string;
  role: 'maham' | 'mammash' | 'rohav';
  full_name: string;
  team_number: string | null;
}

// We map personal_id to a dummy email for Supabase Auth
const getEmailFromPersonalId = (personalId: string) => `${personalId}@app.idf.il`;

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  // Check initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      if (onAuthSuccess) onAuthSuccess(session.user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      if (onAuthSuccess) onAuthSuccess(session.user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });

  return () => {
    subscription.unsubscribe();
  };
};

export const signInWithPersonalId = async (personalId: string): Promise<User | null> => {
  const email = getEmailFromPersonalId(personalId);
  const universalPassword = 'HashlamaPassword123!';

  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: universalPassword,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
       const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: universalPassword,
      });
      if (!signUpError && signUpData.user) {
        return signUpData.user;
      }
    }
    console.error('Sign in error:', error);
    throw new Error('שגיאה בהתחברות: מספר אישי לא מורשה במערכת (לא מוגדר בסגל)');
  }

  return data.user;
};

export const logout = async () => {
  await supabase.auth.signOut();
};
