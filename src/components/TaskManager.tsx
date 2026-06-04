import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Plus, Trash2, CalendarClock, ExternalLink, Link2, ListTodo, FileText, BookOpen, RotateCcw, Users, Activity, CheckSquare } from 'lucide-react';
import type { Task, TaskCompletion, UserProfile, Cadet } from '../types';
import { fetchTasks, fetchTaskCompletions, completeTask, uncompleteTask, createTask, fetchCadets, deleteTask } from '../services/db';
import { isMammashRole } from '../utils';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  profile: UserProfile;
}

type TabType = 'active' | 'completed' | 'tracking';

export default function TaskManager({ profile }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const isStaff = profile.role !== 'צוער';
  const isMammash = isMammashRole(profile.role);
  const myTeam = profile.team_number?.toString() || '';

  // Advanced new task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    target_type: isMammash ? 'team' : 'individual' as 'individual' | 'team' | 'teams' | 'all' | 'personal',
    target_value: isMammash ? myTeam : profile.personal_id,
    selectedTeams: [] as string[],
    deadline: '',
    task_category: 'כללי',
    link_url: ''
  });

  useEffect(() => {
    loadData();
    
    // Polling for real-time updates every 10 seconds
    const interval = setInterval(() => {
      loadLiveUpdates();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    const [t, tc, c] = await Promise.all([
      fetchTasks(),
      fetchTaskCompletions(),
      fetchCadets()
    ]);
    setTasks(t);
    setCompletions(tc);
    setCadets(c);
    setLoading(false);
  };

  const loadLiveUpdates = async () => {
    // Only fetch tasks and completions silently in the background
    const [t, tc] = await Promise.all([
      fetchTasks(),
      fetchTaskCompletions()
    ]);
    setTasks(t);
    setCompletions(tc);
  };

  const myCadet = cadets.find(c => c.personal_id === profile.personal_id);

  const handleComplete = async (taskId: string) => {
    if (!myCadet) return;
    const newComp = { id: Math.random().toString(), task_id: taskId, cadet_id: myCadet.cadet_id, completed_at: new Date().toISOString() };
    setCompletions([...completions, newComp]);
    await completeTask(taskId, myCadet.cadet_id);
    loadData();
  };

  const handleUndoComplete = async (taskId: string) => {
    if (!myCadet) return;
    setCompletions(completions.filter(c => !(c.task_id === taskId && c.cadet_id === myCadet.cadet_id)));
    await uncompleteTask(taskId, myCadet.cadet_id);
    loadData();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק משימה זו? המחיקה תסיר את המשימה ואת כל נתוני הביצוע עבור כלל הצוערים.")) {
      // Optimistic
      setTasks(tasks.filter(t => t.id !== taskId));
      await deleteTask(taskId);
      loadData();
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCadet) return;

    let finalTargetType = newTask.target_type;
    let finalTargetValue = newTask.target_value;

    if (!isStaff) {
      finalTargetType = 'individual';
      finalTargetValue = profile.personal_id;
    } else if (newTask.target_type === 'teams') {
      finalTargetValue = newTask.selectedTeams.join(',');
    } else if (newTask.target_type === 'all') {
      finalTargetValue = null;
    } else if (newTask.target_type === 'team') {
      finalTargetValue = isMammash ? myTeam : newTask.target_value;
    }

    const taskToCreate = {
      title: newTask.title,
      description: newTask.description || null,
      creator_id: myCadet.cadet_id,
      creator_name: profile.full_name,
      creator_role: profile.role,
      target_type: finalTargetType,
      target_value: finalTargetValue,
      task_category: newTask.task_category,
      link_url: newTask.link_url || null,
      deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null
    };

    setIsCreating(false);
    await createTask(taskToCreate);
    loadData();
    setNewTask({ ...newTask, title: '', description: '', selectedTeams: [], link_url: '' });
  };

  const toggleTeamSelection = (team: string) => {
    setNewTask(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(team) 
        ? prev.selectedTeams.filter(t => t !== team)
        : [...prev.selectedTeams, team]
    }));
  };

  if (loading) return <div className="h-40 relative"><LoadingSpinner text="טוען נתונים..." /></div>;

  // Filter tasks that belong to ME to do
  const relevantTasks = tasks.filter(t => {
    if (t.target_type === 'all') return true;
    if (t.target_type === 'team' && t.target_value === myTeam) return true;
    if (t.target_type === 'teams' && t.target_value?.split(',').includes(myTeam)) return true;
    if (t.target_type === 'individual' && t.target_value === profile.personal_id) return true;
    if (!isStaff && t.creator_id === myCadet?.cadet_id) return true; // personal tasks
    return false;
  });

  const myActiveTasks = relevantTasks.filter(t => !completions.some(c => c.task_id === t.id && myCadet && c.cadet_id === myCadet.cadet_id));
  const myCompletedTasks = relevantTasks.filter(t => completions.some(c => c.task_id === t.id && myCadet && c.cadet_id === myCadet.cadet_id));
  
  // Tasks I created (Tracking)
  const myCreatedTasks = tasks.filter(t => t.creator_id === myCadet?.cadet_id);
  
  const uniqueTeams = Array.from(new Set(cadets.map(c => c.team_number).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  
  const availableCadetsForSearch = isStaff 
    ? (isMammash 
        ? cadets.filter(c => c.team_number?.toString() === myTeam)
        : cadets)
    : [];

  const filteredCadetsForSearch = availableCadetsForSearch.filter(c => c.full_name.includes(searchQuery) || c.personal_id.includes(searchQuery));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'טופס': return <FileText size={14} className="text-blue-500" />;
      case 'מטלה': return <BookOpen size={14} className="text-rose-500" />;
      default: return <ListTodo size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in pb-12">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 text-xl">
          {isStaff ? 'מערך משימות' : 'משימות אישיות'}
        </h3>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm active:scale-95 ${
            isStaff ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          {isCreating ? <Trash2 size={14} /> : <Plus size={14} />}
          {isCreating ? 'ביטול' : (isStaff ? 'הקצאת משימה לסגל/צוערים' : 'הוסף משימה לעצמי')}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateSubmit} className={`glass-card p-5 rounded-2xl mb-6 flex flex-col gap-4 border-r-4 ${isStaff ? 'border-r-indigo-500' : 'border-r-orange-500'} animate-slide-down`}>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">כותרת המשימה</label>
              <input 
                required 
                type="text" 
                placeholder="למשל: למלא פק״ל זיווד..." 
                className="w-full bg-white/60 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            {isStaff && (
              <div className="w-1/3">
                <label className="block text-xs font-semibold text-slate-500 mb-1">סוג משימה</label>
                <select
                  className="w-full bg-white/60 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={newTask.task_category}
                  onChange={e => setNewTask({...newTask, task_category: e.target.value})}
                >
                  <option value="כללי">כללי</option>
                  <option value="טופס">טופס מקוון</option>
                  <option value="מטלה">מטלה / קריאה</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">פירוט (אופציונלי)</label>
            <textarea 
              placeholder="הנחיות נוספות או דגשים חשובים..." 
              className="w-full bg-white/60 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none h-16"
              value={newTask.description}
              onChange={e => setNewTask({...newTask, description: e.target.value})}
            />
          </div>

          {isStaff && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><Link2 size={12}/> קישור מצורף לביצוע (אופציונלי)</label>
              <input 
                type="url" 
                placeholder="https://forms.google.com/..." 
                className="w-full bg-white/60 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={newTask.link_url}
                onChange={e => setNewTask({...newTask, link_url: e.target.value})}
              />
            </div>
          )}

          {isStaff && (
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-2">קהל יעד</label>
              <div className="flex flex-col gap-3">
                <select 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                  value={newTask.target_type}
                  onChange={e => setNewTask({...newTask, target_type: e.target.value as any, target_value: e.target.value === 'all' ? null : profile.personal_id})}
                >
                  {isMammash ? (
                    <>
                      <option value="team">הצוות שלי ({myTeam})</option>
                      <option value="individual">צוער ספציפי מהצוות</option>
                    </>
                  ) : (
                    <>
                      <option value="all">כלל ההשלמה</option>
                      <option value="teams">צוותים ספציפיים</option>
                      <option value="team">צוות בודד</option>
                      <option value="individual">צוער ספציפי (חיפוש)</option>
                    </>
                  )}
                </select>

                {newTask.target_type === 'teams' && !isMammash && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {uniqueTeams.map(team => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => toggleTeamSelection(team)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          newTask.selectedTeams.includes(team) 
                            ? 'bg-indigo-500 text-white shadow-sm' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        צוות {team}
                      </button>
                    ))}
                  </div>
                )}

                {newTask.target_type === 'team' && !isMammash && (
                  <input 
                    type="text" 
                    placeholder="הזן מספר צוות (למשל: 3)"
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    required
                    value={newTask.target_value || ''}
                    onChange={e => setNewTask({...newTask, target_value: e.target.value})}
                  />
                )}

                {newTask.target_type === 'individual' && (
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="התחל להקליד שם של צוער..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      required
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                    {showDropdown && filteredCadetsForSearch.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCadetsForSearch.map(c => (
                          <div 
                            key={c.personal_id}
                            className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                            onClick={() => {
                              setNewTask({...newTask, target_value: c.personal_id});
                              setSearchQuery(`${c.full_name} (צוות ${c.team_number || '-'})`);
                              setShowDropdown(false);
                            }}
                          >
                            {c.full_name} <span className="text-slate-400 text-xs">(צוות {c.team_number || '-'})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <button type="submit" className={`text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 ${
            isStaff ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-500 hover:bg-orange-600'
          }`}>
            {isStaff ? 'הפץ משימה עכשיו' : 'שמור משימה אישית'}
          </button>
        </form>
      )}

      {/* Tabs Menu */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-sm font-semibold sticky top-0 z-10 shadow-sm border border-slate-200">
        <button 
          onClick={() => setActiveTab('active')} 
          className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${activeTab === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Activity size={16} /> בביצוע <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[10px]">{myActiveTasks.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('completed')} 
          className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${activeTab === 'completed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CheckSquare size={16} /> הושלמו <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md text-[10px]">{myCompletedTasks.length}</span>
        </button>
        {isStaff && (
          <button 
            onClick={() => setActiveTab('tracking')} 
            className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${activeTab === 'tracking' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={16} /> במעקב <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md text-[10px]">{myCreatedTasks.length}</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        
        {/* ACTIVE TASKS TAB */}
        {activeTab === 'active' && (
          <div className="flex flex-col gap-3">
            {myActiveTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle className="mx-auto mb-3 opacity-50 text-emerald-400" size={42} />
                <p className="font-medium text-slate-600 text-lg">הכל נקי!</p>
                <p className="text-sm mt-1">אין לך משימות פתוחות כרגע.</p>
              </div>
            ) : (
              myActiveTasks.map(task => (
                <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex gap-4 group hover:border-indigo-200 transition-colors relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-1.5 h-full ${
                    task.target_type === 'individual' && task.creator_id === myCadet?.cadet_id ? 'bg-orange-400' : 'bg-indigo-400'
                  }`} />
                  
                  <button 
                    onClick={() => handleComplete(task.id)}
                    className="text-slate-200 hover:text-emerald-500 transition-colors shrink-0 mt-0.5"
                    title="סמן כבוצע"
                  >
                    <Circle size={26} className="group-hover:hidden text-slate-300" />
                    <CheckCircle size={26} className="hidden group-hover:block drop-shadow-sm" />
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-base leading-tight">{task.title}</h4>
                      {task.task_category && task.task_category !== 'כללי' && (
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0">
                          {getCategoryIcon(task.task_category)}
                          {task.task_category}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">{task.description}</p>
                    )}
                    
                    {task.link_url && (
                      <a 
                        href={task.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        <ExternalLink size={14} /> פתח קישור
                      </a>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 text-[10px] font-medium text-slate-400 border-t border-slate-100 pt-3">
                      {task.creator_name ? (
                        <span className="text-slate-500">נפתח ע״י {task.creator_name} {task.creator_role && `(${task.creator_role})`}</span>
                      ) : (
                        <span>מערכת</span>
                      )}
                      {task.deadline && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                            <CalendarClock size={12} /> יעד: {new Date(task.deadline).toLocaleDateString('he-IL')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMPLETED TASKS TAB */}
        {activeTab === 'completed' && (
          <div className="flex flex-col gap-3">
            {myCompletedTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p>עדיין לא סיימת אף משימה.</p>
              </div>
            ) : (
              myCompletedTasks.map(task => (
                <div key={task.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex gap-4 opacity-75 grayscale-[0.5]">
                  <CheckCircle size={26} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-600 line-through">{task.title}</h4>
                    <button 
                      onClick={() => handleUndoComplete(task.id)}
                      className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm"
                    >
                      <RotateCcw size={12} /> החזר לביצוע
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TRACKING TAB (STAFF ONLY) */}
        {activeTab === 'tracking' && isStaff && (
          <div className="flex flex-col gap-4">
            {myCreatedTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p>לא פתחת משימות עבור אחרים.</p>
              </div>
            ) : (
              myCreatedTasks.map(task => {
                // Calculate targets
                let targetCadets: Cadet[] = [];
                if (task.target_type === 'all') targetCadets = cadets;
                else if (task.target_type === 'team') targetCadets = cadets.filter(c => c.team_number?.toString() === task.target_value?.toString());
                else if (task.target_type === 'teams') targetCadets = cadets.filter(c => task.target_value?.split(',').includes(c.team_number?.toString() || ''));
                else if (task.target_type === 'individual') targetCadets = cadets.filter(c => c.personal_id === task.target_value);

                // Cross-reference with completions
                const taskCompletions = completions.filter(c => c.task_id === task.id);
                const completedCadets = targetCadets.filter(c => taskCompletions.some(tc => tc.cadet_id === c.cadet_id));
                const pendingCadets = targetCadets.filter(c => !taskCompletions.some(tc => tc.cadet_id === c.cadet_id));

                const percent = targetCadets.length === 0 ? 0 : Math.round((completedCadets.length / targetCadets.length) * 100);

                return (
                  <div key={task.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 relative">
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="absolute top-4 left-4 text-slate-400 hover:text-rose-500 transition-colors p-1.5 hover:bg-rose-50 rounded-lg"
                        title="מחק משימה"
                      >
                        <Trash2 size={16} />
                      </button>
                      <h4 className="font-bold text-slate-800 text-lg pl-8">{task.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        הוקצה ל: {task.target_type === 'all' ? 'כלל ההשלמה' : task.target_type === 'teams' ? 'צוותים מרובים' : task.target_type === 'team' ? `צוות ${task.target_value}` : 'צוער ספציפי'}
                      </p>
                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-600">התקדמות ביצוע</span>
                          <span className={percent === 100 ? 'text-emerald-500' : 'text-indigo-600'}>{percent}% ({completedCadets.length}/{targetCadets.length})</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-bold text-emerald-600 mb-2 flex items-center gap-1"><CheckCircle size={14}/> ביצעו</h5>
                        <ul className="text-slate-600 space-y-1">
                          {completedCadets.length === 0 ? <li className="text-xs text-slate-400">אף אחד לא ביצע</li> : null}
                          {completedCadets.map(c => (
                            <li key={c.cadet_id} className="truncate text-xs">{c.full_name} <span className="opacity-50">(צ' {c.team_number})</span></li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-r border-slate-100 pr-4">
                        <h5 className="font-bold text-rose-500 mb-2 flex items-center gap-1"><Circle size={14}/> טרם ביצעו</h5>
                        <ul className="text-slate-600 space-y-1">
                          {pendingCadets.length === 0 ? <li className="text-xs text-emerald-500 font-bold">כולם ביצעו! 🎉</li> : null}
                          {pendingCadets.map(c => (
                            <li key={c.cadet_id} className="truncate text-xs">{c.full_name} <span className="opacity-50">(צ' {c.team_number})</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
