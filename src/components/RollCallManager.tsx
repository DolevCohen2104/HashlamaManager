import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Check, Loader2, MapPin, Home } from 'lucide-react';
import type { UserProfile, Cadet, RollCall, RollCallResponse } from '../types';
import { fetchActiveRollCalls, fetchRollCallResponses, createRollCall, closeRollCall, submitRollCallResponse } from '../services/db';

interface Props {
  profile: UserProfile;
  cadets: Cadet[];
}

export default function RollCallManager({ profile, cadets }: Props) {
  const [rollCalls, setRollCalls] = useState<RollCall[]>([]);
  const [responses, setResponses] = useState<Record<string, RollCallResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'general' | 'home' | 'base'>('general');
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const isMaham = profile.role === 'מה"מ';
  const isCadet = profile.role === 'צוער';
  
  // Filter cadets for the current commander if they are a Mefaktz
  const myTeamCadets = isMaham ? cadets : cadets.filter(c => c.team_number === profile.team_number);

  useEffect(() => {
    loadRollCalls();
  }, []);

  useEffect(() => {
    // Poll responses for expanded roll call
    if (!expandedCall && !isCadet) return;
    
    // Cadets poll all active roll calls. Commanders poll the expanded one.
    const pollTarget = isCadet ? rollCalls.map(r => r.id) : (expandedCall ? [expandedCall] : []);
    
    if (pollTarget.length === 0) return;
    
    const interval = setInterval(() => {
      pollTarget.forEach(id => loadResponses(id));
    }, 5000);
    return () => clearInterval(interval);
  }, [expandedCall, isCadet, rollCalls]);

  const loadRollCalls = async () => {
    setLoading(true);
    const calls = await fetchActiveRollCalls();
    setRollCalls(calls);
    
    // Load responses for all active calls if Cadet, or just the first if Commander
    if (calls.length > 0) {
      if (isCadet) {
        await Promise.all(calls.map(c => loadResponses(c.id)));
      } else if (!expandedCall) {
        setExpandedCall(calls[0].id);
        await loadResponses(calls[0].id);
      }
    }
    setLoading(false);
  };

  const loadResponses = async (callId: string) => {
    const resps = await fetchRollCallResponses(callId);
    setResponses(prev => ({ ...prev, [callId]: resps }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    await createRollCall(newTitle.trim(), newType);
    setNewTitle('');
    setIsCreating(false);
    await loadRollCalls();
  };

  const handleClose = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך לסגור מסדר זה?')) return;
    await closeRollCall(id);
    await loadRollCalls();
    if (expandedCall === id) setExpandedCall(null);
  };

  const handleCadetSubmit = async (rollCallId: string) => {
    setSubmitting(rollCallId);
    await submitRollCallResponse(rollCallId, profile.personal_id);
    await loadResponses(rollCallId);
    setSubmitting(null);
  };

  if (loading && rollCalls.length === 0) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  }

  // --- CADET VIEW ---
  if (isCadet) {
    return (
      <div className="w-full flex flex-col gap-4 animate-fade-in pb-24">
        <h2 className="text-xl font-black text-slate-800 mb-2 px-2">מסדרים פעילים</h2>
        {rollCalls.length === 0 ? (
          <div className="text-center text-slate-400 p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
            אין מסדרים פעילים כרגע
          </div>
        ) : (
          rollCalls.map(call => {
            const callResponses = responses[call.id] || [];
            const hasResponded = callResponses.some(r => r.cadet_id === profile.personal_id);

            return (
              <div key={call.id} className={`rounded-3xl p-6 shadow-xl border overflow-hidden relative ${
                hasResponded ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-sky-100'
              }`}>
                {hasResponded && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 rounded-bl-xl font-bold text-sm shadow-sm flex items-center gap-1">
                    <Check size={14} /> אושר
                  </div>
                )}
                <div className="flex items-center gap-4 mb-4 mt-2">
                  <div className={`p-4 rounded-2xl ${hasResponded ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-500'}`}>
                    {call.type === 'home' ? <Home size={32} /> : call.type === 'base' ? <MapPin size={32} /> : <ShieldCheck size={32} />}
                  </div>
                  <div>
                    <h3 className={`text-xl font-black ${hasResponded ? 'text-emerald-900' : 'text-slate-800'}`}>{call.title}</h3>
                    <p className="text-sm text-slate-500">{new Date(call.created_at).toLocaleString('he-IL')}</p>
                  </div>
                </div>

                {!hasResponded ? (
                  <button
                    onClick={() => handleCadetSubmit(call.id)}
                    disabled={submitting === call.id}
                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-lg py-4 rounded-2xl shadow-md shadow-sky-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {submitting === call.id ? <Loader2 className="w-6 h-6 animate-spin" /> : 'אשר נוכחות / הגעה'}
                  </button>
                ) : (
                  <div className="w-full bg-emerald-100/50 text-emerald-700 font-bold text-center py-4 rounded-2xl flex items-center justify-center gap-2">
                    הנוכחות שלך נרשמה בהצלחה!
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  // --- COMMANDER VIEW ---
  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in pb-24">
      {/* Creation form (Maham only) */}
      {isMaham && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" />
            פתיחת מסדר (ירוק בעיניים)
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="שם המסדר (לדוגמה: וידוא הגעה הביתה)"
              className="flex-[2] px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              required
            />
            <div className="flex flex-1 gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="general">כללי</option>
                <option value="home">הגעה הביתה</option>
                <option value="base">נוכחות בבסיס</option>
              </select>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-[1.5] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-md shadow-emerald-500/20 flex justify-center items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus size={20} /> הפעל</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Roll Calls */}
      <h3 className="font-black text-xl text-slate-800 mt-4 px-2">מסדרים פעילים</h3>
      {rollCalls.length === 0 ? (
        <div className="text-center text-slate-400 p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
          אין מסדרים פעילים כרגע
        </div>
      ) : (
        rollCalls.map(call => {
          const callResponses = responses[call.id] || [];
          const respondedCadetIds = new Set(callResponses.map(r => r.cadet_id));
          
          // Calculate progress for my view (Maham sees all, Mefaktz sees team)
          const totalTarget = myTeamCadets.length;
          const respondedTarget = myTeamCadets.filter(c => respondedCadetIds.has(c.personal_id)).length;
          const progressPercentage = totalTarget === 0 ? 0 : Math.round((respondedTarget / totalTarget) * 100);
          
          // Group by team for Maham
          const teamsMap = new Map<string, { total: number, responded: number }>();
          if (isMaham) {
            myTeamCadets.forEach(c => {
              const team = c.team_number || '?';
              if (!teamsMap.has(team)) teamsMap.set(team, { total: 0, responded: 0 });
              teamsMap.get(team)!.total++;
              if (respondedCadetIds.has(c.personal_id)) {
                teamsMap.get(team)!.responded++;
              }
            });
          }

          const missingCadets = myTeamCadets.filter(c => !respondedCadetIds.has(c.personal_id));
          const isComplete = totalTarget > 0 && respondedTarget === totalTarget;

          return (
            <div key={call.id} className={`bg-white rounded-3xl shadow-lg border overflow-hidden flex flex-col transition-all duration-300 ${isComplete ? 'border-emerald-300 shadow-emerald-100' : 'border-slate-100 shadow-slate-200/50'}`}>
              <div 
                className={`p-5 cursor-pointer transition-colors flex justify-between items-center ${isComplete ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                onClick={() => {
                  if (expandedCall !== call.id) {
                    setExpandedCall(call.id);
                    loadResponses(call.id);
                  } else {
                    setExpandedCall(null);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-500'}`}>
                    {call.type === 'home' ? <Home size={24} /> : call.type === 'base' ? <MapPin size={24} /> : <ShieldCheck size={24} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-lg text-slate-800">{call.title}</span>
                    <span className="text-xs font-medium text-slate-400">{new Date(call.created_at).toLocaleString('he-IL')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left flex flex-col items-end">
                    <span className={`text-2xl font-black ${isComplete ? 'text-emerald-500' : 'text-slate-700'}`}>{progressPercentage}%</span>
                    <span className="text-xs font-bold text-slate-400">{respondedTarget} מתוך {totalTarget}</span>
                  </div>
                </div>
              </div>

              {/* Expandable Progress Bar */}
              <div className="h-1.5 w-full bg-slate-100">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${isComplete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {expandedCall === call.id && (
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-5 animate-slide-down">
                  {isMaham ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Array.from(teamsMap.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([team, stats]) => {
                        const teamComplete = stats.total > 0 && stats.responded === stats.total;
                        return (
                          <div key={team} className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 shadow-sm transition-all ${
                            teamComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-sky-200'
                          }`}>
                            <span className={`font-black text-lg ${teamComplete ? 'text-emerald-700' : 'text-slate-700'}`}>צוות {team}</span>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                              <div className={`h-1.5 rounded-full ${teamComplete ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${(stats.responded / stats.total) * 100}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-500 mt-1">{stats.responded}/{stats.total} ירוק</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-sm text-slate-700 mb-3">טרם אישרו ({missingCadets.length}):</h4>
                      <div className="flex flex-wrap gap-2">
                        {missingCadets.map(c => (
                          <span key={c.cadet_id} className="px-3 py-1.5 bg-white border border-rose-200 shadow-sm text-rose-600 text-sm rounded-xl font-bold">
                            {c.full_name}
                          </span>
                        ))}
                        {missingCadets.length === 0 && (
                          <div className="w-full p-4 bg-emerald-100 border border-emerald-200 rounded-2xl text-emerald-700 font-black flex items-center justify-center gap-2">
                            <Check size={20} /> כל הצוות ירוק!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isMaham && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleClose(call.id); }}
                      className="mt-2 text-rose-500 text-sm font-bold bg-rose-50 hover:bg-rose-100 py-3 rounded-xl transition-colors active:scale-[0.98]"
                    >
                      סגור מסדר (העבר לארכיון)
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
