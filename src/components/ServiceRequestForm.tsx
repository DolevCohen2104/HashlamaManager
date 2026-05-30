import React, { useState } from 'react';
import { submitServiceRequest } from '../services/db';
import type { UserProfile, Cadet } from '../types';
import { fetchCadets } from '../services/db';
import { CheckCircle, ArrowRight } from 'lucide-react';

interface Props {
  profile: UserProfile;
  type: 'maintenance' | 'leave' | 'clinic';
  onClose: () => void;
}

const TYPE_DETAILS = {
  maintenance: { title: 'דיווח תקלות בינוי ותשתיות', icon: '🔧', color: 'bg-orange-500' },
  leave: { title: 'בקשת יציאה / חופשה', icon: '🏃', color: 'bg-indigo-500' },
  clinic: { title: 'בקשת חופ"ל / תור לרופא', icon: '⚕️', color: 'bg-rose-500' }
};

export default function ServiceRequestForm({ profile, type, onClose }: Props) {
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const info = TYPE_DETAILS[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cadets = await fetchCadets();
    const myCadet = cadets.find(c => c.personal_id === profile.personal_id);
    if (!myCadet) return;

    await submitServiceRequest({
      cadet_id: myCadet.cadet_id,
      type,
      details: { text: details },
      status: 'pending'
    });

    setSubmitted(true);
    setTimeout(() => onClose(), 2000);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
        <CheckCircle size={64} className="text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">הבקשה נשלחה בהצלחה!</h2>
        <p className="text-slate-500 mt-2">הסגל יעבור על הבקשה ויטפל בה בהתאם.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-slide-up">

      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-14 h-14 ${info.color} text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
            {info.icon}
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{info.title}</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block font-semibold text-slate-700 mb-2">פירוט הבקשה / הבעיה</label>
            <textarea
              required
              rows={5}
              placeholder="אנא פרט כמה שניתן..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none transition-shadow"
              value={details}
              onChange={e => setDetails(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={`${info.color} hover:opacity-90 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-md active:scale-95 mt-2`}
          >
            שלח בקשה
          </button>
        </form>
      </div>
    </div>
  );
}
