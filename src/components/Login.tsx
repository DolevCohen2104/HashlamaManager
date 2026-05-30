import React, { useState, useEffect } from 'react';
import { checkUserStatus, loginWithPin, setPinCode, registerLocalBiometric, verifyLocalBiometric, hasBiometricEnabled, AppUser } from '../auth';
import { Fingerprint, Loader2, KeyRound, ChevronRight, Lock } from 'lucide-react';

interface Props {
  onLoginComplete: (user: AppUser) => void;
}

type LoginStep = 'personal_id' | 'enter_pin' | 'set_pin' | 'biometric_prompt';

export default function Login({ onLoginComplete }: Props) {
  const [step, setStep] = useState<LoginStep>('personal_id');
  const [personalId, setPersonalId] = useState('');
  const [pinCode, setPinCodeValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometricSupported(true);
    }
  }, []);

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
        // Try biometric first if enabled
        if (hasBiometricEnabled(personalId) && biometricSupported) {
          const success = await verifyLocalBiometric(personalId);
          if (success) {
            const user = await loginWithPin(personalId, undefined, true);
            onLoginComplete(user);
            return;
          }
          // If biometric fails or user cancels, fallback to PIN
        }
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
        if (biometricSupported && !hasBiometricEnabled(personalId)) {
          setStep('biometric_prompt');
          setIsProcessing(false);
          return;
        }
        // If no biometric supported, login directly
        const user = await loginWithPin(personalId, pinCode);
        onLoginComplete(user);
      } else {
        const user = await loginWithPin(personalId, pinCode);
        onLoginComplete(user);
      }
    } catch (err: any) {
      setError(err.message || 'קוד סודי שגוי או שגיאה בשרת');
      setPinCodeValue(''); // clear on error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegisterBiometric = async (accept: boolean) => {
    setIsProcessing(true);
    try {
      if (accept) {
        await registerLocalBiometric(personalId);
      }
      const user = await loginWithPin(personalId, pinCode); // using the pin they just set
      onLoginComplete(user);
    } catch (err) {
      console.error(err);
      // Fallback to login even if biometric setup fails
      const user = await loginWithPin(personalId, pinCode);
      onLoginComplete(user);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-4 text-right animate-fade-in" dir="rtl">
      <div className="max-w-md w-full glass-card rounded-[2rem] p-8 md:p-10 flex flex-col items-center border border-white/60 animate-slide-up shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400/20 via-transparent to-transparent z-0 pointer-events-none"></div>
        
        {step !== 'personal_id' && step !== 'biometric_prompt' && (
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
            
            {step === 'enter_pin' && biometricSupported && hasBiometricEnabled(personalId) && (
              <button
                type="button"
                onClick={async () => {
                  const success = await verifyLocalBiometric(personalId);
                  if (success) {
                    const user = await loginWithPin(personalId, undefined, true);
                    onLoginComplete(user);
                  }
                }}
                className="flex items-center justify-center gap-2 text-sky-600 hover:text-sky-700 font-bold p-3 bg-sky-50 rounded-xl transition-colors mt-2"
              >
                <Fingerprint size={20} />
                כניסה ביומטרית (Face ID / טביעת אצבע)
              </button>
            )}
          </form>
        )}

        {step === 'biometric_prompt' && (
          <div className="w-full flex flex-col gap-5 z-10 mt-4 animate-fade-in text-center">
            <div className="mx-auto w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 mb-2">
              <Fingerprint size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">כניסה מהירה וקלה!</h2>
            <p className="text-sm text-slate-600">
              רוצה להתחבר בפעמים הבאות בקלות בעזרת טביעת אצבע או זיהוי פנים (Face ID)?
            </p>
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => handleRegisterBiometric(true)}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white transition-all py-4 px-4 rounded-2xl font-bold active:scale-[0.98] text-lg"
              >
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'כן, הפעל זיהוי ביומטרי'}
              </button>
              <button
                onClick={() => handleRegisterBiometric(false)}
                disabled={isProcessing}
                className="w-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors py-3 px-4 font-bold"
              >
                לא תודה, אמשיך עם קוד סודי
              </button>
            </div>
          </div>
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
