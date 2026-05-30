import React, { useState } from 'react';
import { checkUserStatus, loginWithPin, setPinCode, AppUser } from '../auth';
import { Loader2, KeyRound, ChevronRight, Lock } from 'lucide-react';

interface Props {
  onLoginComplete: (user: AppUser) => void;
}

type LoginStep = 'personal_id' | 'enter_pin' | 'set_pin';

export default function Login({ onLoginComplete }: Props) {
  const [step, setStep] = useState<LoginStep>('personal_id');
  const [personalId, setPersonalId] = useState('');
  const [pinCode, setPinCodeValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalId || personalId.trim().length < 5) {
      setError('נא להזין מספר אישי תקין');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    try {
      const { exists, hasPin } = await checkUserStatus(personalId);
      
      if (!exists) {
        setError('מספר אישי לא מזוהה במערכת');
        setIsProcessing(false);
        return;
      }

      if (hasPin) {
        setStep('enter_pin');
      } else {
        setStep('set_pin');
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בבדיקת מספר אישי');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length !== 4) {
      setError('הקוד חייב להכיל בדיוק 4 ספרות');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (step === 'set_pin') {
        await setPinCode(personalId, pinCode);
      }
      const user = await loginWithPin(personalId, pinCode);
      onLoginComplete(user);
    } catch (err: any) {
      setError(err.message || 'קוד סודי שגוי או שגיאה בשרת');
      setPinCodeValue(''); // clear on error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-4 text-right animate-fade-in" dir="rtl">
      <div className="max-w-md w-full glass-card rounded-[2rem] p-8 md:p-10 flex flex-col items-center border border-white/60 animate-slide-up shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400/20 via-transparent to-transparent z-0 pointer-events-none"></div>
        
        {step !== 'personal_id' && (
          <button 
            onClick={() => { setStep('personal_id'); setPinCodeValue(''); setError(null); }}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 z-20 p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 z-10 text-sky-500 p-4">
          <img src="/tikshuv.png" alt="תקשוב" className="w-full h-full object-contain drop-shadow-sm" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 mb-2 text-center z-10">ניהול השלמה</h1>

        {step === 'personal_id' && (
          <form onSubmit={handleIdSubmit} className="w-full flex flex-col gap-5 z-10 mt-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">מספר אישי</label>
              <input
                type="text"
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value.replace(/\D/g, ''))}
                placeholder="הזן מספר אישי לזיהוי"
                inputMode="numeric"
                className="w-full px-5 py-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white shadow-sm transition-all text-lg font-medium tracking-wider text-center"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white transition-all py-4 px-4 rounded-2xl font-bold shadow-md shadow-sky-500/20 active:scale-[0.98] disabled:opacity-70 disabled:hover:from-sky-500 disabled:active:scale-100 text-lg"
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'המשך'}
            </button>
          </form>
        )}

        {(step === 'enter_pin' || step === 'set_pin') && (
          <form onSubmit={handlePinSubmit} className="w-full flex flex-col gap-5 z-10 mt-2 animate-fade-in">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                <KeyRound size={22} className="text-sky-500" />
                {step === 'set_pin' ? 'צור קוד סודי' : 'הזן קוד סודי'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {step === 'set_pin' 
                  ? 'מכיוון שזוהי כניסתך הראשונה, אנא קבע קוד סודי בעל 4 ספרות.'
                  : 'אנא הזן את קוד ה-PIN שלך באפליקציה.'}
              </p>
            </div>
            <div>
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCodeValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                autoFocus
                className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 transition-all text-4xl font-mono tracking-[0.5em] text-center"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing || pinCode.length !== 4}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white transition-all py-4 px-4 rounded-2xl font-bold shadow-md shadow-sky-500/20 active:scale-[0.98] disabled:opacity-70 disabled:hover:from-sky-500 disabled:active:scale-100 text-lg"
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : (step === 'set_pin' ? 'שמור קוד והמשך' : 'היכנס')}
            </button>
          </form>
        )}
        
        {error && (
          <div className="mt-6 w-full bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium text-center shadow-sm z-10 flex items-center justify-center gap-2 animate-shake">
            <Lock size={16} />
            {error}
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-200/50 w-full text-center z-10">
          <p className="text-xs text-slate-400 font-medium">
            מחזור 020
          </p>
        </div>
      </div>
    </div>
  );
}
