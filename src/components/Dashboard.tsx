import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Users, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronLeft, Edit3 } from 'lucide-react';
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
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [mahamEditMode, setMahamEditMode] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  // Debounce timers for absence reason auto-save
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const toggleTeam = (team: string) =>
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(team) ? next.delete(team) : next.add(team);
      return next;
    });

  // Listen for beforeunload to prevent data loss on refresh if there are pending saves
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasPendingSaves = Object.keys(debounceTimers.current).length > 0;
      if (hasPendingSaves) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

      // Auto-open current event for Mammash / Maham
      if (profile.role !== 'צוער' && evts.length > 0 && !selectedEventId) {
        const now = new Date();
        const currentEvent = evts.find(e => {
          if (!e.start || !e.end) return false;
          const start = new Date(e.start);
          const end = new Date(e.end);
          // Check if now is between start - 15 minutes and end
          const startMinus15 = new Date(start.getTime() - 15 * 60000);
          return now >= startMinus15 && now <= end;
        });

        if (currentEvent) {
          setSelectedEventId(currentEvent.id);
          setAttendanceLoading(true);
          try {
            const logs = await fetchAttendanceForEvent(currentEvent.id);
            setAttendance(logs);
          } catch (err) {
            console.error(err);
          } finally {
            setAttendanceLoading(false);
          }
        }
      }
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
      setAttendance([]);
      setMahamEditMode(false);
      return;
    }
    setSelectedEventId(eventId);
    setAttendance([]); // clear stale data immediately
    setAttendanceLoading(true);
    try {
      const logs = await fetchAttendanceForEvent(eventId);
      setAttendance(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
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

    // Total across all teams
    const allLogs = attendance;
    const totalPresent = allLogs.filter(log => log.status === true || log.status as any === 't').length;
    const totalCadets = cadets.length;
    const totalAbsent = allLogs.filter(log => log.status === false || log.status as any === 'f').length;

    if (attendanceLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>טוען נתוני נוכחות...</span>
        </div>
      );
    }

    return (
      <div className="w-full">
        {/* Grand total banner */}
        <div className="mb-5 p-4 rounded-xl flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-sky-400" />
            <span className="font-semibold text-lg">סה"כ מצבה</span>
          </div>
          <div className="flex items-center gap-4 text-lg font-bold">
            <span className="text-emerald-400">{totalPresent} נוכחים</span>
            <span className="text-slate-500">|</span>
            <span className="text-red-400">{totalAbsent} נעדרים</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">{totalCadets} בסה"כ</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {teams.map(team => {
            const teamCadets = cadets.filter(c => c.team_number?.toString() === team);
            if (teamCadets.length === 0) return null;
            const teamLogs = attendance.filter(log => teamCadets.some(c => c.cadet_id === log.cadet_id));
            // Normalize boolean (Supabase can return 't'/'f' or true/false)
            const presentCount = teamLogs.filter(log => log.status === true || log.status as any === 't').length;
            const absentLogs = teamLogs.filter(log => log.status === false || log.status as any === 'f');
            const absentCount = absentLogs.length;
            const unmarkedCount = teamCadets.length - teamLogs.length;
            return (
              <div key={team} className={`p-4 rounded-xl border-2 shadow-sm ${
                absentCount > 0 ? 'border-red-200 bg-red-50' :
                presentCount === teamCadets.length ? 'border-emerald-200 bg-emerald-50' :
                'border-slate-200 bg-white'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700 text-base">צוות {team}</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    presentCount === teamCadets.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {presentCount}/{teamCadets.length} נוכחים
                  </span>
                </div>
                {unmarkedCount > 0 && (
                  <p className="text-xs text-amber-600 mb-1">{unmarkedCount} ללא דיווח</p>
                )}
                {absentCount > 0 && (
                  <div className="mt-2 text-xs border-t border-red-100 pt-2">
                    <span className="text-red-600 font-semibold">{absentCount} נעדרים:</span>
                    <ul className="mt-1 space-y-1">
                      {absentLogs.map(log => {
                        const cadet = teamCadets.find(c => c.cadet_id === log.cadet_id);
                        return (
                          <li key={log.log_id} className="text-slate-700">
                            <span className="font-medium">{cadet?.full_name}</span>
                            {log.absence_reason && (
                              <span className="text-slate-500"> – {log.absence_reason}</span>
                            )}
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

  // ─── Maham edit mode: full cadet list grouped by team ───────────────────────
  const renderMahamEdit = (eventId: string) => {
    const teams = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const handleToggle = async (cadet: Cadet, newStatus: boolean) => {
      const log = attendance.find(a => a.cadet_id === cadet.cadet_id);
      const newLog = {
        event_id: eventId,
        cadet_id: cadet.cadet_id,
        status: newStatus,
        absence_reason: '',
        notes: '',

        updated_at: new Date().toISOString(),
      };
      const tempId = log?.log_id ?? Math.random().toString();
      setAttendance(prev => {
        const existing = [...prev];
        const idx = existing.findIndex(a => a.cadet_id === cadet.cadet_id);
        if (idx > -1) existing[idx] = { ...newLog, log_id: tempId };
        else existing.push({ ...newLog, log_id: tempId });
        return existing;
      });
      await upsertAttendance(newLog);
      const fresh = await fetchAttendanceForEvent(eventId);
      setAttendance(fresh);
    };

    const handleReasonChange = (cadetId: string, reason: string) => {
      setAttendance(prev =>
        prev.map(a => a.cadet_id === cadetId ? { ...a, absence_reason: reason } : a)
      );
      // Auto-save with 600ms debounce
      clearTimeout(debounceTimers.current[cadetId]);
      debounceTimers.current[cadetId] = setTimeout(async () => {
        const log = attendance.find(a => a.cadet_id === cadetId);
        if (log) await upsertAttendance({ ...log, absence_reason: reason });
        delete debounceTimers.current[cadetId]; // clear timer when done
      }, 600);
    };

    const handleReasonBlur = async (cadetId: string, reason: string) => {
      // On blur: cancel debounce and save immediately if there was one pending
      if (debounceTimers.current[cadetId]) {
        clearTimeout(debounceTimers.current[cadetId]);
        delete debounceTimers.current[cadetId];
        const log = attendance.find(a => a.cadet_id === cadetId);
        if (!log) return;
        await upsertAttendance({ ...log, absence_reason: reason });
      }
    };

    const markTeamAllPresent = async (teamCadets: Cadet[]) => {
      const now = new Date().toISOString();
      setAttendance(prev => {
        const next = [...prev];
        teamCadets.forEach(cadet => {
          const idx = next.findIndex(a => a.cadet_id === cadet.cadet_id);
          const newLog = { event_id: eventId, cadet_id: cadet.cadet_id, status: true, absence_reason: '', notes: '', updated_at: now, log_id: next[idx]?.log_id ?? Math.random().toString() };
          if (idx > -1) next[idx] = newLog;
          else next.push(newLog);
        });
        return next;
      });
      await Promise.all(teamCadets.map(cadet =>
        upsertAttendance({ event_id: eventId, cadet_id: cadet.cadet_id, status: true, absence_reason: '', notes: '', updated_at: now })
      ));
      const fresh = await fetchAttendanceForEvent(eventId);
      setAttendance(fresh);
    };

    return (
      <div className="w-full space-y-3">
        {teams.map(team => {
          const teamCadets = cadets.filter(c => c.team_number?.toString() === team);
          if (teamCadets.length === 0) return null;
          const isExpanded = expandedTeams.has(`edit-${team}`);
          const markedCount = teamCadets.filter(c => attendance.some(a => a.cadet_id === c.cadet_id)).length;
          const presentCount = teamCadets.filter(c => attendance.some(a => a.cadet_id === c.cadet_id && (a.status === true || (a.status as any) === 't'))).length;
          return (
            <div key={team} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Team header – always visible */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                <button
                  onClick={() => toggleTeam(`edit-${team}`)}
                  className="flex items-center gap-2 flex-1 text-right"
                >
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                  <span className="font-bold text-slate-700">צוות {team}</span>
                  <span className="text-xs text-slate-500 mr-1">({presentCount}/{teamCadets.length} סומנו)</span>
                </button>
                <button
                  onClick={() => markTeamAllPresent(teamCadets)}
                  className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  כולם נוכחים
                </button>
              </div>
              {/* Cadet list – collapsible */}
              {isExpanded && (
                <div className="p-3 space-y-1.5 border-t border-slate-100">
                  {teamCadets.map(cadet => {
                    const log = attendance.find(a => a.cadet_id === cadet.cadet_id);
                    const marked = log !== undefined;
                    const isPresent = log?.status;
                    return (
                      <div key={cadet.cadet_id} className={`rounded-xl border-2 overflow-hidden transition-colors ${
                        !marked ? 'border-slate-200 bg-white' :
                        isPresent ? 'border-emerald-300 bg-emerald-50' :
                        'border-red-300 bg-red-50/60'
                      }`}>
                        <div className="flex items-stretch" style={{ minHeight: '52px' }}>
                          <div className="flex-1 px-3 flex items-center">
                            <span className="font-semibold text-slate-800 text-sm">{cadet.full_name}</span>
                          </div>
                          <button
                            onClick={() => handleToggle(cadet, true)}
                            className={`w-14 flex items-center justify-center text-xl font-bold border-r border-slate-100 transition-colors active:scale-95 ${
                              isPresent === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                            }`}
                          >✓</button>
                          <button
                            onClick={() => handleToggle(cadet, false)}
                            className={`w-14 flex items-center justify-center text-xl font-bold transition-colors active:scale-95 ${
                              isPresent === false ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'
                            }`}
                          >✗</button>
                        </div>
                        {isPresent === false && (
                          <div className="px-3 pb-2 pt-1.5 border-t border-red-200">
                            <input
                              type="text"
                              placeholder="סיבת היעדרות..."
                              value={log?.absence_reason || ''}
                              onChange={e => handleReasonChange(cadet.cadet_id, e.target.value)}
                              onBlur={e => handleReasonBlur(cadet.cadet_id, e.target.value)}
                              className="w-full text-sm bg-white border border-red-200 text-red-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-red-300"
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
        })}
      </div>
    );
  };

  const renderMammashList = (eventId: string) => {
    if (selectedEventId !== eventId) return null;

    const myTeam = profile.team_number?.toString() ?? '';
    const isExpanded = expandedTeams.has(`mammash-${myTeam}`);
    const presentCount = relevantCadets.filter(c =>
      attendance.some(a => a.cadet_id === c.cadet_id && (a.status === true || (a.status as any) === 't'))
    ).length;

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
            { event_id: eventId, cadet_id: cadet.cadet_id, status: true, absence_reason: '', notes: '', updated_at: now },
            log?.log_id
          );
        })
      );
      // Sync real log_ids from DB
      const logs = await fetchAttendanceForEvent(eventId);
      setAttendance(logs);
    };

    return (
      <div className="mt-4">
        {/* Team header – always visible */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
            <button
              onClick={() => toggleTeam(`mammash-${myTeam}`)}
              className="flex items-center gap-2 flex-1 text-right"
            >
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
              <span className="font-semibold text-slate-800">צוות {myTeam}</span>
              <span className="text-xs text-slate-500 mr-1">({presentCount}/{relevantCadets.length} סומנו)</span>
            </button>
            {relevantCadets.length > 0 && (
              <button
                onClick={markAllPresent}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                <CheckCircle size={14} />
                כולם נוכחים
              </button>
            )}
          </div>

          {/* Cadet list – collapsible */}
          {isExpanded && (
            <div className="p-3 space-y-2 border-t border-slate-100">
              {relevantCadets.length === 0 ? (
                <p className="text-sm text-slate-500">אין צוערים רשומים לצוות זה.</p>
              ) : (
                relevantCadets.map(cadet => {
              const log = attendance.find(a => a.cadet_id === cadet.cadet_id);
              // 3 states: undefined = not marked (grey), true = present (green), false = absent (red)
              const marked = log !== undefined;
              const isPresent = log?.status; // undefined | true | false

              const handleToggle = async (newStatus: boolean) => {
                const newLog = {
                  event_id: eventId,
                  cadet_id: cadet.cadet_id,
                  status: newStatus,
                  absence_reason: '',
                  notes: '',

                  updated_at: new Date().toISOString(),
                };
                // Optimistic update
                const existing = [...attendance];
                const idx = existing.findIndex(a => a.cadet_id === cadet.cadet_id);
                const tempId = log?.log_id ?? Math.random().toString();
                if (idx > -1) existing[idx] = { ...newLog, log_id: tempId };
                else existing.push({ ...newLog, log_id: tempId });
                setAttendance(existing);
                // Persist + sync real log_id from DB
                await upsertAttendance(newLog);
                const fresh = await fetchAttendanceForEvent(eventId);
                setAttendance(fresh);
              };

              const handleReasonChange = (reason: string) => {
                setAttendance(prev =>
                  prev.map(a => a.cadet_id === cadet.cadet_id ? { ...a, absence_reason: reason } : a)
                );
                // Auto-save with 600ms debounce
                clearTimeout(debounceTimers.current[cadet.cadet_id]);
                debounceTimers.current[cadet.cadet_id] = setTimeout(async () => {
                  const currentLog = attendance.find(a => a.cadet_id === cadet.cadet_id);
                  if (currentLog) await upsertAttendance({ ...currentLog, absence_reason: reason });
                  delete debounceTimers.current[cadet.cadet_id]; // clear timer when done
                }, 600);
              };

              const handleReasonBlur = async (reason: string) => {
                if (debounceTimers.current[cadet.cadet_id]) {
                  clearTimeout(debounceTimers.current[cadet.cadet_id]);
                  delete debounceTimers.current[cadet.cadet_id];
                  const currentLog = attendance.find(a => a.cadet_id === cadet.cadet_id);
                  if (!currentLog) return;
                  await upsertAttendance({ ...currentLog, absence_reason: reason });
                }
              };

              return (
                <div
                  key={cadet.cadet_id}
                className={`rounded-xl border-2 overflow-hidden transition-colors duration-150 ${
                    !marked
                      ? 'border-slate-200 bg-white'
                      : isPresent
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-red-300 bg-red-50/60'
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
                        isPresent === true
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
                        isPresent === false
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'
                      }`}
                    >
                      ✗
                    </button>
                  </div>

                  {/* Absence reason – full width, appears below name */}
                  {isPresent === false && (
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

      {!isMammash && !isCadet && selectedEventId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-3">
              <h3 className="font-bold text-lg text-slate-800 truncate">
                מצבת נוכחות – {events.find(e => e.id === selectedEventId)?.summary}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setMahamEditMode(m => !m)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                    mahamEditMode
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <Edit3 size={13} />
                  {mahamEditMode ? 'צפייה' : 'עריכה'}
                </button>
                <button 
                  onClick={() => { setSelectedEventId(null); setMahamEditMode(false); }}
                  className="text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors p-1"
                >
                  <XCircle size={28} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto" dir="rtl">
              {mahamEditMode
                ? renderMahamEdit(selectedEventId)
                : renderMahamSummary(selectedEventId)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
