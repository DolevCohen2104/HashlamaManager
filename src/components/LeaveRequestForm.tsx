import React, { useState } from 'react';
import { submitServiceRequest, fetchCadets } from '../services/db';
import type { UserProfile } from '../types';
import { CheckCircle, ArrowRight, CalendarOff } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

export default function LeaveRequestForm({ profile, onClose }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    departureDateTime: '',
    returnDateTime: '',
    transportation: '',
    missedContent: '',
    justification: ''
  });

  const checkIsExceptional = (departureISO: string) => {
    if (!departureISO) return false;
    const departureDate = new Date(departureISO);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the Wednesday of the week before departure
    const wednesdayBefore = new Date(departureDate);
    // getDay(): 0 is Sunday, 1 is Monday... 6 is Saturday
    // Subtract getDay() to get to Sunday of departure's week, then subtract 4 more days to get to Wednesday of the previous week
    wednesdayBefore.setDate(departureDate.getDate() - departureDate.getDay() - 4);
    wednesdayBefore.setHours(23, 59, 59, 999); // End of Wednesday

    return today.getTime() > wednesdayBefore.getTime();
  };

  const isExceptional = checkIsExceptional(formData.departureDateTime);
  const title = `בקשת יציאה${isExceptional ? ' חריגה ' : ' '} | השלמה טכנולוגית 020`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cadets = await fetchCadets();
    const myCadet = cadets.find(c => c.personal_id === profile.personal_id);
    if (!myCadet) return;

    const requestDetails = {
      title,
      requestDate: new Date().toLocaleDateString('he-IL'),
      name: profile.full_name,
      team: profile.team_number || 'ללא צוות',
      reason: formData.reason,
      departure: formData.departureDateTime ? new Date(formData.departureDateTime).toLocaleString('he-IL') : '',
      return: formData.returnDateTime ? new Date(formData.returnDateTime).toLocaleString('he-IL') : '',
      transportation: formData.transportation,
      missedContent: formData.missedContent,
      justification: formData.justification,
      isExceptional
    };

    await submitServiceRequest({
      cadet_id: myCadet.cadet_id,
      type: 'leave',
      details: requestDetails,
      status: 'pending'
    });

    setSubmitted(true);
    setTimeout(() => onClose(), 2500);
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
    <div className="max-w-2xl mx-auto animate-slide-up pb-12">

      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <CalendarOff size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {title}
            </h2>
            {isExceptional && (
              <p className="text-rose-500 text-sm font-bold mt-1">
                * שים לב: בקשה זו מוגדרת כחריגה מכיוון שהוגשה לאחר יום רביעי של השבוע הקודם ליציאה.
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">שם המבקש</label>
              <div className="font-medium text-slate-800">{profile.full_name}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">צוות</label>
              <div className="font-medium text-slate-800">{profile.team_number || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">תאריך הגשה</label>
              <div className="font-medium text-slate-800">{new Date().toLocaleDateString('he-IL')}</div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">סיבת הבקשה</label>
            <input
              required
              type="text"
              placeholder="לדוגמה: אירוע משפחתי, סידור רפואי..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">תאריך ושעת יציאה מבוקשת</label>
              <input
                required
                type="datetime-local"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={formData.departureDateTime}
                onChange={e => setFormData({ ...formData, departureDateTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">תאריך ושעת חזרה מבוקשת</label>
              <input
                required
                type="datetime-local"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={formData.returnDateTime}
                onChange={e => setFormData({ ...formData, returnDateTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">דרכי הגעה / יציאה</label>
            <input
              required
              type="text"
              placeholder="לדוגמה: אוטובוס מקו 123 / רכב פרטי..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              value={formData.transportation}
              onChange={e => setFormData({ ...formData, transportation: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">תוכן שמופסד בעקבות היציאה</label>
            <input
              required
              type="text"
              placeholder="לדוגמה: שיעור תקשורת בסיסי, הרצאת מפקד..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              value={formData.missedContent}
              onChange={e => setFormData({ ...formData, missedContent: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">נימוק מפורט</label>
            <textarea
              required
              rows={4}
              placeholder="פרט את הסיבה לבקשה בצורה מלאה..."
              className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-shadow"
              value={formData.justification}
              onChange={e => setFormData({ ...formData, justification: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg active:scale-95 mt-4"
          >
            שלח בקשת יציאה {isExceptional ? 'חריגה' : ''}
          </button>
        </form>
      </div>
    </div>
  );
}
