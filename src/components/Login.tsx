import React, { useState } from 'react';
import { signInWithPersonalId } from '../auth';
import { Shield } from 'lucide-react';

interface Props {
  onLoginComplete: () => void;
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
        onLoginComplete();
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-right" dir="rtl">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        <div className="p-8 pb-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 text-blue-400">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">השלמה טכנולוגית</h1>
          <p className="text-slate-400 text-center mb-8">
            מערכת ניהול לו"ז ומצבה למפקדים וסגל
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">מספר אישי</label>
              <input
                type="text"
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value)}
                placeholder="הזן מספר אישי"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-4 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white transition-colors py-3 px-4 rounded-xl font-bold shadow-sm"
            >
              {isLoggingIn ? 'מתחבר...' : 'התחבר למערכת'}
            </button>
          </form>
          
          {error && (
            <p className="mt-4 text-red-400 text-sm font-medium">{error}</p>
          )}
        </div>
        <div className="bg-slate-900/50 px-8 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            הגישה למערכת מוגבלת לבעלי תפקידים מורשים בלבד.
          </p>
        </div>
      </div>
    </div>
  );
}
