import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Users, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronLeft } from 'lucide-react';
import type { UserProfile, CalendarEvent, Cadet, AttendanceLog } from '../types';
import { fetchTodayEvents } from '../services/calendar';
import { fetchCadets, fetchAttendanceForEvent, upsertAttendance } from '../services/db';

interface Props {
  profile: UserProfile;
}

export default function Dashboard({ profile }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evts, cdts] = await Promise.all([
        fetchTodayEvents(),
        fetchCadets()
      ]);
      setEvents(evts);
      setCadets(cdts);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'MISSING_CONFIG') {
        setError('חסרות הגדרות לטעינת יומן ההשלמה. יש להגדיר את VITE_SHARED_CALENDAR_ID ואת VITE_GOOGLE_CALENDAR_API_KEY בהגדרות הסביבה (Secrets), ולוודא שהיומן הציבורי מוגדר כפומבי.');
      } else {
        setError(err.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEventAttendance = async (eventId: string) => {
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId(eventId);
    try {
      const logs = await fetchAttendanceForEvent(eventId);
      setAttendance(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const isMammash = profile.role === 'ממ"ש';
  const isCadet = profile.role === 'צוער';
  
  const relevantCadets = isMammash 
    ? cadets.filter(c => c.team_number?.toString() === profile.team_number?.toString())
    : cadets;

  const totalRelevantCadets = relevantCadets.length;
  
  const renderMahamSummary = (eventId: string) => {
    if (selectedEventId !== eventId) return null;
    const teams = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return (
      <div className="w-full">
        <h4 className="font-medium text-slate-800 mb-4 flex items-center gap-2 text-lg border-b border-slate-100 pb-2">
          <Users size={20} className="text-blue-500" />
          סיכום נוכחות כללי לפי צוותים
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teams.map(team => {
            const teamCadets = cadets.filter(c => c.team_number?.toString() === team);
            if (teamCadets.length === 0) return null;
            const teamLogs = attendance.filter(log => teamCadets.some(c => c.cadet_id === log.cadet_id));
            const presentCount = teamLogs.filter(log => log.status === true).length;
            const absentCount = teamLogs.filter(log => log.status === false).length;
            return (
              <div key={team} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-700">צוות {team}</span>
                  <span className="text-sm font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {presentCount}/{teamCadets.length} חתומים
                  </span>
                </div>
                {absentCount > 0 && (
                  <div className="mt-2 text-xs border-t border-slate-100 pt-2">
                    <span className="text-red-500 font-medium">{absentCount} נעדרים:</span>
                    <ul className="mt-1 space-y-1">
                      {teamLogs.filter(log => log.status === false).map(log => {
                        const cadet = teamCadets.find(c => c.cadet_id === log.cadet_id);
                        return (
                          <li key={log.log_id} className="text-slate-600 truncate">
                            {cadet?.full_name} - {log.absence_reason || 'ללא סיבה'}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Mammash mobile-friendly attendance list ───────────────────────────────
  const renderMammashList = (eventId: string) => {
    if (selectedEventId !== eventId) return null;

    const markAllPresent = async () => {
      const now = new Date().toISOString();
      // Optimistic UI update first
      const newAttendance = relevantCadets.map(cadet => {
        const existing = attendance.find(a => a.cadet_id === cadet.cadet_id);
        return existing
          ? { ...existing, status: true, absence_reason: '' }
          : {
              log_id: Math.random().toString(),
              event_id: eventId,
              cadet_id: cadet.cadet_id,
              status: true,
              absence_reason: '',
              notes: '',
              updated_by: profile.personal_id,
              updated_at: now,
            } as AttendanceLog;
      });
      setAttendance(newAttendance);

      // Persist to DB in parallel
      await Promise.all(
        relevantCadets.map(cadet => {
          const log = attendance.find(a => a.cadet_id === cadet.cadet_id);
          if (log && log.status === true) return Promise.resolve();
          return upsertAttendance(
            { event_id: eventId, cadet_id: cadet.cadet_id, status: true, absence_reason: '', notes: '', updated_by: profile.personal_id, updated_at: now },
            log?.log_id
          );
        })
      );
      // Sync real log_ids from DB
      const logs = await fetchAttendanceForEvent(eventId);
      setAttendance(logs);
    };

    return (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" />
            סימון נוכחות – צוות {profile.team_number}
          </h4>
          {relevantCadets.length > 0 && (
            <button
              onClick={markAllPresent}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <CheckCircle size={14} />
              כולם נוכחים
            </button>
          )}
        </div>

        {relevantCadets.length === 0 ? (
          <p className="text-sm text-slate-500">אין צוערים רשומים לצוות זה.</p>
        ) : (
          <div className="space-y-2">
            {relevantCadets.map(cadet => {
              const log = attendance.find(a => a.cadet_id === cadet.cadet_id);
              const isPresent = log ? log.status : true;

              const handleToggle = async (newStatus: boolean) => {
                const newLog = {
                  event_id: eventId,
                  cadet_id: cadet.cadet_id,
                  status: newStatus,
                  absence_reason: '',
                  notes: '',
                  updated_by: profile.personal_id,
                  updated_at: new Date().toISOString(),
                };
                // Optimistic update
                const existing = [...attendance];
                const idx = existing.findIndex(a => a.cadet_id === cadet.cadet_id);
                const tempId = log?.log_id ?? Math.random().toString();
                if (idx > -1) existing[idx] = { ...newLog, log_id: tempId };
                else existing.push({ ...newLog, log_id: tempId });
                setAttendance(existing);
                await upsertAttendance(newLog, log?.log_id);
              };

              // Local-only reason change (saves on blur to avoid DB spam)
              const handleReasonChange = (reason: string) => {
                setAttendance(prev =>
                  prev.map(a => a.cadet_id === cadet.cadet_id ? { ...a, absence_reason: reason } : a)
                );
              };

              const handleReasonBlur = async (reason: string) => {
                const currentLog = attendance.find(a => a.cadet_id === cadet.cadet_id);
                if (!currentLog) return;
                await upsertAttendance({ ...currentLog, absence_reason: reason }, currentLog.log_id);
              };

              return (
                <div
                  key={cadet.cadet_id}
                  className={`rounded-xl border-2 overflow-hidden transition-colors duration-150 ${
                    isPresent ? 'border-emerald-200 bg-white' : 'border-red-300 bg-red-50/60'
                  }`}
                >
                  {/* Cadet row */}
                  <div className="flex items-stretch" style={{ minHeight: '56px' }}>
                    {/* Name */}
                    <div className="flex-1 px-4 flex items-center">
                      <span className="font-semibold text-slate-800 text-[15px] leading-tight">{cadet.full_name}</span>
                    </div>
                    {/* ✓ button – large touch target */}
                    <button
                      onClick={() => handleToggle(true)}
                      className={`w-16 flex items-center justify-center text-2xl font-bold border-r border-slate-100 transition-colors active:scale-95 ${
                        isPresent
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                      }`}
                    >
                      ✓
                    </button>
                    {/* ✗ button – large touch target */}
                    <button
                      onClick={() => handleToggle(false)}
                      className={`w-16 flex items-center justify-center text-2xl font-bold transition-colors active:scale-95 ${
                        !isPresent
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'
                      }`}
                    >
                      ✗
                    </button>
                  </div>

                  {/* Absence reason – full width, appears below name */}
                  {!isPresent && (
                    <div className="px-4 pb-3 pt-2 border-t border-red-200">
                      <input
                        type="text"
                        placeholder="סיבת היעדרות..."
                        value={log?.absence_reason || ''}
                        onChange={e => handleReasonChange(e.target.value)}
                        onBlur={e => handleReasonBlur(e.target.value)}
                        className="w-full text-sm bg-white border border-red-200 text-red-700 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-red-300"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span>טוען נתונים...</span>
      </div>
    );
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'כל היום';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'כל היום';
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900">לו"ז יומי - {new Date().toLocaleDateString('he-IL')}</h2>
          <p className="text-slate-500">
            {events.length} אירועים היום מתוך Google Calendar
          </p>
        </div>
        
        {!isCadet && (
          <div className="flex gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border-b-4 border-emerald-500 text-center min-w-[160px]">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                {isMammash ? 'כוח אדם בצוות' : 'סך הכל מצבה בהשלמה'}
              </p>
              <p className="text-3xl font-black text-slate-800">
                {totalRelevantCadets}
              </p>
            </div>
          </div>
        )}
      </header>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {events.length === 0 && !error ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <CalendarIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">אין אירועים בלוח השנה להיום</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-white border-r-4 border-sky-400 rounded-l-lg rounded-r-none mb-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-t border-b border-l border-slate-100 overflow-hidden">
              <button 
                onClick={() => !isCadet && loadEventAttendance(event.id)}
                className={`w-full text-right p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 focus:outline-none transition-colors ${!isCadet ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-slate-400 font-mono text-sm w-12 shrink-0">
                    {formatTime(event.start)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{event.summary}</h3>
                    {event.location && event.location !== 'No Location' && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
                
                {!isCadet && (
                  <div className="flex items-center gap-1 text-sky-600 bg-sky-50 px-2 py-1 rounded">
                    <span className="text-xs font-bold">
                      {isMammash ? (selectedEventId === event.id ? 'סגור נוכחות' : 'ניהול נוכחות') : 'הצג מצבה'}
                    </span>
                    {isMammash && (selectedEventId === event.id ? <ChevronDown size={14} /> : <ChevronLeft size={14} />)}
                  </div>
                )}
              </button>
              
              {/* Expandable attendance area for Mammash */}
              {isMammash && (
                <div className={`transition-all duration-300 ease-in-out px-4 overflow-hidden ${selectedEventId === event.id ? 'pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {renderMammashList(event.id)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Maham Popup */}
      {!isMammash && !isCadet && selectedEventId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                מצבת נוכחות – {events.find(e => e.id === selectedEventId)?.summary}
              </h3>
              <button 
                onClick={() => setSelectedEventId(null)}
                className="text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors p-1"
              >
                <XCircle size={28} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto" dir="rtl">
              {renderMahamSummary(selectedEventId)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
