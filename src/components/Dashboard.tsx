import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronLeft } from 'lucide-react';
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
    
    // Group cadets by team
    const teams = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
          <Users size={16} className="text-blue-500" />
          סיכום נוכחות צוותי
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {teams.map(team => {
            const teamCadets = cadets.filter(c => c.team_number?.toString() === team);
            if (teamCadets.length === 0) return null;
            
            const teamLogs = attendance.filter(log => teamCadets.some(c => c.cadet_id === log.cadet_id));
            const presentCount = teamLogs.filter(log => log.status === true).length;
            const absentCount = teamLogs.filter(log => log.status === false).length;
            // Assuming unmarked means present by default? No, unmarked means unknown. Let's assume present.
            // Wait, standard practice: unmarked is considered absent or unknown. The specific requirements didn't state this, but let's just count explicitly marked.
            
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

  const renderMammashList = (eventId: string) => {
    if (selectedEventId !== eventId) return null;
    
    return (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-800 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" />
            סימון נוכחות צוותית - צוות {profile.team_number}
          </h4>
          {relevantCadets.length > 0 && (
            <button 
              onClick={async () => {
                // Optimistically set all to present in UI
                const now = new Date().toISOString();
                const newAttendance = [...attendance];
                
                const promises = relevantCadets.map(cadet => {
                  const log = attendance.find(a => a.cadet_id === cadet.cadet_id);
                  if (log && log.status === true) return Promise.resolve();
                  
                  const newLog = {
                    event_id: eventId,
                    cadet_id: cadet.cadet_id,
                    status: true,
                    absence_reason: '',
                    notes: '',
                    updated_by: profile.personal_id,
                    updated_at: now
                  };
                  
                  // Update local stateoptimistically
                  const idx = newAttendance.findIndex(a => a.cadet_id === cadet.cadet_id);
                  if (idx > -1) newAttendance[idx] = { ...newLog, log_id: log!.log_id };
                  else newAttendance.push({ ...newLog, log_id: Math.random().toString() });
                  
                  return upsertAttendance(newLog, log?.log_id);
                });
                
                setAttendance(newAttendance);
                await Promise.all(promises);
                
                // Refresh from DB to get real log_ids
                const logs = await fetchAttendanceForEvent(eventId);
                setAttendance(logs);
              }}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <CheckCircle size={14} />
              אשר נוכחות לכולם
            </button>
          )}
        </div>
        <div className="space-y-3">
          {relevantCadets.length === 0 ? (
            <p className="text-sm text-slate-500">אין צוערים רשומים לצוות זה. הוסף צוערים בספר השלמה.</p>
          ) : (
            relevantCadets.map(cadet => {
              const log = attendance.find(a => a.cadet_id === cadet.cadet_id);
              const isPresent = log ? log.status : true; // Default to present visually if no log
              
              const handleToggle = async (status: boolean) => {
                const newLog = {
                  event_id: eventId,
                  cadet_id: cadet.cadet_id,
                  status,
                  absence_reason: status ? '' : 'לוז חיצוני', // default reason
                  notes: '',
                  updated_by: profile.personal_id,
                  updated_at: new Date().toISOString()
                };
                await upsertAttendance(newLog, log?.log_id);
                // Optimistic update
                const existing = [...attendance];
                const idx = existing.findIndex(a => a.cadet_id === cadet.cadet_id);
                if (idx > -1) existing[idx] = { ...newLog, log_id: log!.log_id, updated_at: new Date().toISOString() };
                else existing.push({ ...newLog, log_id: Math.random().toString(), updated_at: new Date().toISOString() });
                setAttendance(existing);
              };

              const handleReasonChange = async (reason: string) => {
                if (!log) return;
                await upsertAttendance({ ...log, absence_reason: reason }, log.log_id);
                const updated = attendance.map(a => a.log_id === log.log_id ? { ...a, absence_reason: reason } : a);
                setAttendance(updated);
              };

              return (
                <div key={cadet.cadet_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm gap-3">
                  <div className="font-medium text-slate-800">{cadet.full_name}</div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggle(true)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isPresent ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      נוכח/ת
                    </button>
                    <button
                      onClick={() => handleToggle(false)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        !isPresent ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      נעדר/ת
                    </button>
                    
                    {!isPresent && (
                      <input 
                        type="text"
                        placeholder="סיבת היעדרות (חופשי)..."
                        value={log?.absence_reason || ''}
                        onChange={(e) => handleReasonChange(e.target.value)}
                        className="text-sm bg-white border border-red-200 text-red-700 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 w-48 placeholder:text-red-300"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
                      {selectedEventId === event.id ? 'סגור נוכחות' : 'ניהול נוכחות'}
                    </span>
                    {selectedEventId === event.id ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                  </div>
                )}
              </button>
              
              {/* Expandable attendance area */}
              <div className={`transition-all duration-300 ease-in-out px-4 overflow-hidden ${selectedEventId === event.id ? 'pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                {isMammash ? renderMammashList(event.id) : renderMahamSummary(event.id)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
