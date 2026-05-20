import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

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

export const signInWithPersonalId = async (personalId: string, password: string): Promise<User | null> => {
  const email = getEmailFromPersonalId(personalId);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error);
    throw new Error('שגיאה בהתחברות: מספר אישי או סיסמה שגויים');
  }

  return data.user;
};

export const logout = async () => {
  await supabase.auth.signOut();
};
