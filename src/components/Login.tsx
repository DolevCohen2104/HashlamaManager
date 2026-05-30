import React, { useState } from 'react';
import { signInWithPersonalId, AppUser } from '../auth';
import { Shield, Loader2 } from 'lucide-react';

interface Props {
  onLoginComplete: (user: AppUser) => void;
}

export default function Login({ onLoginComplete }: Props) {
  const [personalId, setPersonalId] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalId) {
      setError('נא להזין מספר אישי');
      return;
    }
    
    setIsLoggingIn(true);
    setError(null);
    try {
      const user = await signInWithPersonalId(personalId);
      if (user) {
        onLoginComplete(user);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-4 text-right animate-fade-in" dir="rtl">
      <div className="max-w-md w-full glass-card rounded-[2rem] p-8 md:p-10 flex flex-col items-center border border-white/60 animate-slide-up shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400/20 via-transparent to-transparent z-0 pointer-events-none"></div>
        
        <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 z-10 text-sky-500 p-4">
          <img src="/tikshuv.png" alt="תקשוב" className="w-full h-full object-contain drop-shadow-sm" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-2 text-center z-10">ניהול השלמה</h1>
        <p className="text-slate-500 text-center mb-10 z-10 font-medium">
          מחזור 020
        </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 z-10">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">מספר אישי</label>
              <input
                type="text"
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value)}
                placeholder="הזן מספר אישי לזיהוי"
                className="w-full px-5 py-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white shadow-sm transition-all text-lg font-medium tracking-wider"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white transition-all py-4 px-4 rounded-2xl font-bold shadow-md shadow-sky-500/20 active:scale-[0.98] disabled:opacity-70 disabled:hover:from-sky-500 disabled:active:scale-100 text-lg"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  מתחבר...
                </>
              ) : 'היכנס למערכת'}
            </button>
          </form>
          
          {error && (
            <div className="mt-6 w-full bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium text-center shadow-sm">
              {error}
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-200/50 w-full text-center z-10">
            <p className="text-xs text-slate-400 font-medium">
              הגישה למערכת מוגבלת לבעלי תפקידים מורשים
            </p>
          </div>
      </div>
    </div>
  );
}
