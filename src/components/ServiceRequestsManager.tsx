import React, { useState, useEffect } from 'react';
import { fetchServiceRequests, updateServiceRequestStatus, fetchCadets } from '../services/db';
import type { UserProfile, ServiceRequest } from '../types';
import { ArrowRight, CheckCircle, Clock, XCircle, PenTool, CalendarOff, Cross } from 'lucide-react';

interface Props {
  profile: UserProfile;
  filterType: 'maintenance' | 'clinic' | 'leave';
  teamFilter?: string | null;
  onClose?: () => void;
  isManager?: boolean;
}

const TYPE_CONFIG = {
  maintenance: { title: 'ניהול תקלות בינוי ותשתיות', myTitle: 'סטטוס תקלות שדיווחתי', icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-50' },
  leave: { title: 'ניהול בקשות יציאה', myTitle: 'סטטוס בקשות היציאה שלי', icon: CalendarOff, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  clinic: { title: 'ניהול בקשות חופ"ל / רופא', myTitle: 'סטטוס בקשות חופ"ל שלי', icon: Cross, color: 'text-rose-500', bg: 'bg-rose-50' }
};

export default function ServiceRequestsManager({ profile, filterType, teamFilter, onClose, isManager = true }: Props) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const config = TYPE_CONFIG[filterType];

  useEffect(() => {
    loadRequests();
  }, [filterType, teamFilter, isManager]);

  const loadRequests = async () => {
    setLoading(true);
    let data = await fetchServiceRequests(filterType);
    
    if (isManager && teamFilter && teamFilter !== 'all') {
      data = data.filter(r => r.details?.team === teamFilter);
    }

    if (!isManager) {
      const cadets = await fetchCadets();
      const myCadet = cadets.find(c => c.personal_id === profile.personal_id);
      if (myCadet) {
        data = data.filter(r => r.cadet_id === myCadet.cadet_id);
      } else {
        data = [];
      }
    }
    
    setRequests(data);
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    await updateServiceRequestStatus(id, status);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><Clock size={12}/> ממתין לטיפול</span>;
      case 'in_progress': return <span className="bg-sky-100 text-sky-600 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><Clock size={12}/> בטיפול</span>;
      case 'approved': return <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> אושר / טופל</span>;
      case 'rejected': return <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><XCircle size={12}/> סורב / בוטל</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up pb-12">
      {onClose && (
        <button onClick={onClose} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowRight size={18} /> חזור לדף הבית
        </button>
      )}

      <div className="flex items-center gap-4 mb-8">
        <div className={`w-14 h-14 ${config.bg} ${config.color} rounded-2xl flex items-center justify-center shadow-sm border border-white/50`}>
          <config.icon size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{isManager ? config.title : config.myTitle}</h2>
          <p className="text-slate-500 text-sm">
            {!isManager ? 'מעקב אחר הבקשות שפתחת' : (teamFilter && teamFilter !== 'all' ? `מציג בקשות עבור צוות ${teamFilter}` : 'מציג את כלל הבקשות בהשלמה')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">טוען נתונים...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
          <config.icon size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">אין בקשות פתוחות כרגע</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-slate-800">{req.details?.title || 'בקשה'}</h3>
                    {renderStatusBadge(req.status)}
                  </div>
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-700">{req.details?.name}</span> (צוות {req.details?.team}) • הוגש ב-{req.details?.requestDate || new Date(req.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
                
                {isManager && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {req.status === 'pending' && (
                      <button onClick={() => handleUpdateStatus(req.id, 'in_progress')} className="bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                        העבר לטיפול
                      </button>
                    )}
                    {req.status !== 'approved' && (
                      <button onClick={() => handleUpdateStatus(req.id, 'approved')} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                        אשר / סמן כטופל
                      </button>
                    )}
                    {req.status !== 'rejected' && (
                      <button onClick={() => handleUpdateStatus(req.id, 'rejected')} className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                        דחה / בטל
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {Object.entries(req.details || {}).map(([key, value]) => {
                  if (['title', 'name', 'team', 'requestDate', 'isExceptional', 'image'].includes(key)) return null;
                  
                  const labelMap: Record<string, string> = {
                    reason: 'סיבה',
                    departure: 'מועד יציאה',
                    return: 'מועד חזרה',
                    transportation: 'דרכי הגעה',
                    missedContent: 'תוכן מופסד',
                    justification: 'נימוק',
                    location: 'מיקום',
                    description: 'תיאור',
                    severity: 'חומרה'
                  };

                  return (
                    <div key={key} className={key === 'justification' || key === 'description' ? 'md:col-span-2' : ''}>
                      <span className="font-bold block text-slate-500 mb-0.5">{labelMap[key] || key}:</span>
                      {String(value)}
                    </div>
                  );
                })}
              </div>

              {req.details?.image && (
                <div className="mt-4">
                  <span className="font-bold block text-slate-500 mb-2 text-sm">תמונה מצורפת:</span>
                  <img src={req.details.image} alt="צורף דיווח" className="rounded-xl max-h-64 border border-slate-200 shadow-sm" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
