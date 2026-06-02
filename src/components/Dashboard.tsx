import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Users, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Edit3, MessageCircle, Gift, Loader2, ListTodo, ShieldCheck } from 'lucide-react';
import type { UserProfile, CalendarEvent, Cadet, AttendanceLog } from '../types';
import { fetchTodayEvents } from '../services/calendar';
import { fetchCadets, fetchAttendanceForEvent, upsertAttendance, cleanupOldAttendance, fetchActiveRollCalls, fetchSystemSetting, updateSystemSetting } from '../services/db';
import { getWhatsAppLink } from '../utils';
import LoadingSpinner from './LoadingSpinner';
import TaskManager from './TaskManager';
import RollCallManager from './RollCallManager';

interface Props {
  profile: UserProfile;
}

export default function Dashboard({ profile }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Normalize role to handle different quote types (e.g., ממ"ש vs ממ״ש vs ממ''ש)
  const normalizedRole = profile.role ? profile.role.replace(/["'״]/g, '"') : '';
  
  const [activeView, setActiveView] = useState<'tasks' | 'schedule' | 'mifkad'>(normalizedRole === 'צוער' ? 'tasks' : 'schedule');
  const [hasActiveRollCalls, setHasActiveRollCalls] = useState(false);
  const [tasksEnabled, setTasksEnabled] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [mahamEditMode, setMahamEditMode] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
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
      const [evts, cdts, _, rollCalls, initialTasksEnabled] = await Promise.all([
        fetchTodayEvents(),
        fetchCadets(),
        cleanupOldAttendance(),
        fetchActiveRollCalls(),
        fetchSystemSetting('tasks_tab_enabled')
      ]);
      setEvents(evts);
      setCadets(cdts);
      setHasActiveRollCalls(rollCalls.length > 0);
      setTasksEnabled(initialTasksEnabled !== false); // default true if null
      setError(null);

      // Auto-open current event for Mammash / Maham
      if (normalizedRole !== 'צוער' && evts.length > 0 && !selectedEventId) {
        const now = new Date();
        const sortedEvts = [...evts].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        
        const currentEvent = sortedEvts.find((e, i) => {
          if (!e.start || !e.end) return false;
          const start = new Date(e.start);
          let end = new Date(e.end);
          
          const nextEvent = sortedEvts[i + 1];
          if (nextEvent && nextEvent.start) {
            const nextStartMinus10 = new Date(new Date(nextEvent.start).getTime() - 10 * 60000);
            if (nextStartMinus10 < end) {
              end = nextStartMinus10;
            }
          }

          const startMinus10 = new Date(start.getTime() - 10 * 60000);
          return now >= startMinus10 && now <= end;
        });

        if (currentEvent) {
          setSelectedEventId(currentEvent.id);
          
          // Auto-expand the inner accordion lists
          if (normalizedRole === 'ממ"ש') {
            setExpandedTeams(new Set([`mammash-${profile.team_number}`]));
          } else {
            // For Maham, maybe expand all or leave collapsed? Let's expand all
            const allTeams = ['1', '2', '3', '4', '5', '6', '7', '8'].map(t => `edit-${t}`);
            setExpandedTeams(new Set(allTeams));
          }

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

  // Real-time polling for active roll calls and settings - always running, for all users
  useEffect(() => {
    const pollGlobals = async () => {
      try {
        const [rollCalls, isTasksEnabled] = await Promise.all([
          fetchActiveRollCalls(),
          fetchSystemSetting('tasks_tab_enabled')
        ]);
        
        setHasActiveRollCalls(rollCalls.length > 0);
        const tasksCurrentlyEnabled = isTasksEnabled !== false;
        setTasksEnabled(tasksCurrentlyEnabled);
        
        // If user is on mifkad tab and roll call was closed (and not maham), redirect them out
        if (rollCalls.length === 0 && activeView === 'mifkad' && normalizedRole !== 'מה"מ') {
          setActiveView(normalizedRole === 'צוער' ? (tasksCurrentlyEnabled ? 'tasks' : 'schedule') : 'schedule');
        }

        // If tasks are disabled and user is on tasks tab (and not maham), redirect to schedule
        if (!tasksCurrentlyEnabled && activeView === 'tasks' && normalizedRole !== 'מה"מ') {
          setActiveView('schedule');
        }
        
        // If tasks are enabled and cadet is on schedule tab, redirect back to tasks (since they have no other view)
        if (tasksCurrentlyEnabled && activeView === 'schedule' && normalizedRole === 'צוער') {
          setActiveView('tasks');
        }
      } catch (err) {}
    };

    // Poll immediately on mount, then every 5 seconds
    pollGlobals();
    const intervalId = setInterval(pollGlobals, 5000);
    return () => clearInterval(intervalId);
  }, [activeView, normalizedRole]);

  // Real-time polling for the currently viewed attendance
  useEffect(() => {
    if (!selectedEventId) return;

    const intervalId = setInterval(async () => {
      // Skip update if there are pending local changes (typing a reason)
      if (Object.keys(debounceTimers.current).length > 0) return;
      
      try {
        const freshLogs = await fetchAttendanceForEvent(selectedEventId);
        setAttendance(freshLogs);
      } catch (err) {
        console.error('Failed to poll attendance:', err);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [selectedEventId]);

  const isMammash = normalizedRole === 'ממ"ש';
  const isStaff = ['מפק"צ', 'סמק"ס', 'מק"ס', 'ממ"ש', 'מה"מ'].includes(normalizedRole);
  const isCadet = !isStaff;
  const isMaham = normalizedRole === 'מה"מ';
  
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
        <div className="mb-4 p-3 rounded-xl flex items-center justify-between bg-slate-900 text-white shadow-md">
          <div className="flex items-center gap-1.5">
            <Users size={18} className="text-sky-400" />
            <span className="font-semibold text-base">מצבה</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="text-emerald-400">{totalPresent} נוכחים</span>
            <span className="text-slate-600">|</span>
            <span className="text-red-400">{totalAbsent} נעדרים</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">{totalCadets} סה"כ</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-slide-down">
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
              <div 
                key={team} 
                onClick={() => mahamEditMode && setEditingTeam(team)}
                className={`p-3 rounded-xl border flex flex-col justify-center ${
                  mahamEditMode ? 'cursor-pointer hover:border-sky-400 shadow-sm hover:shadow-md transition-all' : 'shadow-sm'
                } ${
                  absentCount > 0 ? 'border-red-200 bg-red-50/50' :
                  presentCount === teamCadets.length ? 'border-emerald-200 bg-emerald-50/50' :
                  'border-slate-200 bg-white'
                }`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-slate-800 text-sm">צוות {team}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                    presentCount === teamCadets.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {presentCount}/{teamCadets.length}
                  </span>
                </div>
                {unmarkedCount > 0 && (
                  <p className="text-[11px] font-semibold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 self-start mt-0.5">{unmarkedCount} ללא דיווח</p>
                )}
                {absentCount > 0 && (
                  <div className="mt-1.5 text-[11px] border-t border-red-100 pt-1.5">
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

  // ─── Maham edit mode: single team drill-down ───────────────────────
  const renderMahamEdit = (eventId: string) => {
    if (!editingTeam) {
      return (
        <div className="animate-fade-in">
          <p className="text-sm font-bold text-center bg-sky-50 text-sky-700 py-3 rounded-xl mb-4 border border-sky-100">
            בחרו צוות מהרשימה לעריכת המצבה שלו 👆
          </p>
          {renderMahamSummary(eventId)}
        </div>
      );
    }

    const team = editingTeam;
    const teamCadets = cadets.filter(c => c.team_number?.toString() === team);    const handleToggle = async (cadet: Cadet, newStatus: boolean) => {
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

    const presentCount = teamCadets.filter(c => attendance.some(a => a.cadet_id === c.cadet_id && (a.status === true || (a.status as any) === 't'))).length;

    return (
      <div className="w-full space-y-3 animate-fade-in">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Team header – always visible */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 text-lg">צוות {team}</span>
              <span className="text-sm font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">{presentCount}/{teamCadets.length} סומנו</span>
            </div>
            <button
              onClick={() => markTeamAllPresent(teamCadets)}
              className="text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              כולם נוכחים
            </button>
          </div>
          {/* Cadet list */}
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
                      {isPresent === false && cadet.phone_number && (
                        <a 
                          href={getWhatsAppLink(cadet.phone_number)}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mr-3 text-emerald-500 bg-emerald-50 p-1.5 rounded-full hover:bg-emerald-100 transition-colors flex-shrink-0"
                          title="שלח הודעת וואטסאפ"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
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
        </div>
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
            <div className="p-3 space-y-2 border-t border-slate-100 animate-slide-down">
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
                      {isPresent === false && cadet.phone_number && (
                        <a 
                          href={getWhatsAppLink(cadet.phone_number)}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mr-3 text-emerald-500 bg-emerald-50 p-1.5 rounded-full hover:bg-emerald-100 transition-colors flex-shrink-0"
                          title="שלח הודעת וואטסאפ"
                        >
                          <MessageCircle size={16} />
                        </a>
                      )}
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
            }))}
            {/* Extra space at the end so the last expanded event clears the floating navbar */}
            <div className="h-12 w-full shrink-0"></div>
          </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner text='טוען לו"ז יומי...' />;
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'כל היום';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'כל היום';
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">


      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Birthday Alert Banner */}
      {(() => {
        const today = new Date();
        const birthdaysToday = cadets.filter(c => {
          if (!c.birth_date) return false;
          const bd = new Date(c.birth_date);
          return bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();
        });

        if (birthdaysToday.length > 0) {
          return (
            <div className="mb-6 bg-gradient-to-r from-rose-400 to-orange-400 text-white px-4 py-4 rounded-xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <Gift size={28} className="animate-bounce" />
                <div>
                  <h3 className="font-bold text-lg leading-tight">מזל טוב! יש היום יום הולדת 🎉</h3>
                  <p className="text-sm opacity-90">
                    {birthdaysToday.map(c => `${c.full_name} (צוות ${c.team_number})`).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Global Roll Call Banner for non-managers (Cadets, Mefaktzim, etc.) */}
      {normalizedRole !== 'ממ"ש' && normalizedRole !== 'מה"מ' && hasActiveRollCalls && (
        <div className="mb-6 animate-fade-in">
          <RollCallManager profile={{...profile, role: normalizedRole}} cadets={cadets} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-32 md:pb-8">
        {activeView === 'tasks' ? (
          <div className="h-full flex flex-col gap-6">
            {!tasksEnabled && normalizedRole !== 'מה"מ' ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center">
                <ListTodo size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">לא הוגדרו משימות למילוי כרגע</p>
              </div>
            ) : (
              <TaskManager profile={profile} />
            )}
          </div>
        ) : activeView === 'schedule' ? (
          <div className="flex flex-col h-full pr-2">
            <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900">לו"ז יומי - {new Date().toLocaleDateString('he-IL')}</h2>
                <p className="text-slate-500">
                  {events.length} אירועים היום מתוך Google Calendar
                </p>
              </div>
              {normalizedRole === 'מה"מ' && (
                <button
                  onClick={async () => {
                    const newValue = !tasksEnabled;
                    setTasksEnabled(newValue);
                    await updateSystemSetting('tasks_tab_enabled', newValue);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border ${tasksEnabled ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                  <ListTodo size={18} />
                  {tasksEnabled ? 'משימות: פעיל' : 'משימות: מושבת'}
                </button>
              )}
            </header>

      {events.length === 0 && !error ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <CalendarIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">אין אירועים בלו"ז להיום</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div 
              key={event.id} 
              className="glass-card border-r-4 border-sky-400 rounded-l-2xl rounded-r-none mb-4 overflow-hidden group"
            >
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
          <div className="h-16 w-full shrink-0"></div>
        </div>
      )}
          </div>
        ) : null}
      </div>

      {activeView === 'mifkad' && (
        <div className="mt-6 mb-24 max-w-7xl mx-auto w-full animate-fade-in">
          <RollCallManager profile={{...profile, role: normalizedRole}} cadets={cadets} />
        </div>
      )}

      {(() => {
        const hasTasksTab = normalizedRole === 'מה"מ' || (normalizedRole === 'ממ"ש' && tasksEnabled);
        const hasMifkadTab = normalizedRole === 'מה"מ' || (normalizedRole === 'ממ"ש' && hasActiveRollCalls);
        const hasMultipleTabs = hasTasksTab || hasMifkadTab;

        if (!hasMultipleTabs) return null;

        return (
          <div className="fixed bottom-4 left-4 right-4 z-40 glass shadow-2xl border border-white/60 rounded-2xl flex items-center overflow-hidden">
          {(normalizedRole === 'מה"מ' || (normalizedRole === 'ממ"ש' && tasksEnabled)) && (
            <button 
              onClick={() => setActiveView('tasks')}
              className={`flex-1 py-3 px-1 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${activeView === 'tasks' ? 'text-indigo-600 bg-indigo-50/80 scale-105 shadow-inner' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50/50'}`}
            >
              <ListTodo size={20} className={activeView === 'tasks' ? 'drop-shadow-sm' : ''} /> ניהול משימות
            </button>
          )}
          <button 
            onClick={() => setActiveView('schedule')}
            className={`flex-1 py-3 px-1 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${activeView === 'schedule' ? 'text-indigo-600 bg-indigo-50/80 scale-105 shadow-inner' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50/50'}`}
          >
            <CalendarIcon size={20} className={activeView === 'schedule' ? 'drop-shadow-sm' : ''} /> ניהול לו"ז ומצבות
          </button>
          {(normalizedRole === 'מה"מ' || (normalizedRole === 'ממ"ש' && hasActiveRollCalls)) && (
            <button 
              onClick={() => setActiveView('mifkad')}
              className={`flex-1 py-3 px-1 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${activeView === 'mifkad' ? 'text-indigo-600 bg-indigo-50/80 scale-105 shadow-inner' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50/50'}`}
            >
              <ShieldCheck size={20} className={activeView === 'mifkad' ? 'drop-shadow-sm' : ''} /> ירוק בעיניים
            </button>
          )}
        </div>
        );
      })()}

      {!isMammash && !isCadet && selectedEventId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-start pt-28 pb-8 px-4 overflow-y-auto">
          <div className="bg-white my-auto w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {mahamEditMode && editingTeam && (
                  <button 
                    onClick={() => setEditingTeam(null)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors ml-1 shrink-0"
                    title="חזור לרשימת הצוותים"
                  >
                    <ChevronRight size={22} />
                  </button>
                )}
                <h3 
                  className="font-bold text-lg text-slate-800 truncate"
                  title={`מצבת נוכחות – ${events.find(e => e.id === selectedEventId)?.summary || ''}`}
                >
                  מצבת נוכחות – {events.find(e => e.id === selectedEventId)?.summary}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isMaham && !editingTeam && (
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
                )}
                <button 
                  onClick={() => { setSelectedEventId(null); setMahamEditMode(false); setEditingTeam(null); }}
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