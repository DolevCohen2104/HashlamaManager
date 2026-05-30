import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Plus, Trash2, CalendarClock } from 'lucide-react';
import type { Task, TaskCompletion, UserProfile, Cadet } from '../types';
import { fetchTasks, fetchTaskCompletions, completeTask, createTask, fetchCadets } from '../services/db';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  profile: UserProfile;
}

export default function TaskManager({ profile }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    target_type: 'individual' as 'individual' | 'team' | 'all',
    target_value: profile.personal_id,
    deadline: ''
  });

  useEffect(() => {
    loadData();
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

  const handleComplete = async (taskId: string) => {
    // Find my cadet_id based on personal_id
    const myCadet = cadets.find(c => c.personal_id === profile.personal_id);
    if (!myCadet) return;

    // Optimistic
    const newComp = {
      id: Math.random().toString(),
      task_id: taskId,
      cadet_id: myCadet.cadet_id,
      completed_at: new Date().toISOString()
    };
    setCompletions([...completions, newComp]);
    
    // DB
    await completeTask(taskId, myCadet.cadet_id);
    loadData();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const myCadet = cadets.find(c => c.personal_id === profile.personal_id);
    if (!myCadet) return;

    const taskToCreate = {
      title: newTask.title,
      description: newTask.description || null,
      creator_id: myCadet.cadet_id,
      target_type: newTask.target_type,
      target_value: newTask.target_value,
      deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null
    };

    setIsCreating(false);
    await createTask(taskToCreate);
    loadData();
    setNewTask({ ...newTask, title: '', description: '' });
  };

  if (loading) return <div className="h-40 relative"><LoadingSpinner text="טוען משימות..." /></div>;

  // Filter tasks that belong to me
  const myCadet = cadets.find(c => c.personal_id === profile.personal_id);
  const myTeam = profile.team_number?.toString();
  
  const relevantTasks = tasks.filter(t => {
    if (t.target_type === 'all') return true;
    if (t.target_type === 'team' && t.target_value === myTeam) return true;
    if (t.target_type === 'individual' && t.target_value === profile.personal_id) return true;
    // Also if I created it, I can see it
    if (myCadet && t.creator_id === myCadet.cadet_id) return true;
    return false;
  });

  // Separate active vs completed for ME
  const myActiveTasks = relevantTasks.filter(t => {
    return !completions.some(c => c.task_id === t.id && myCadet && c.cadet_id === myCadet.cadet_id);
  });

  const isStaff = profile.role !== 'צוער';

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 text-lg">משימות אישיות</h3>
        {isStaff && (
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="text-xs bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-200 transition-colors"
          >
            {isCreating ? <Cross size={14} /> : <Plus size={14} />}
            {isCreating ? 'ביטול' : 'משימה חדשה'}
          </button>
        )}
      </div>

      {isCreating && isStaff && (
        <form onSubmit={handleCreateSubmit} className="glass-card p-4 rounded-2xl mb-6 flex flex-col gap-3 border-l-4 border-l-indigo-400">
          <input 
            required 
            type="text" 
            placeholder="כותרת המשימה..." 
            className="bg-white/50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={newTask.title}
            onChange={e => setNewTask({...newTask, title: e.target.value})}
          />
          <textarea 
            placeholder="פירוט (אופציונלי)" 
            className="bg-white/50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none h-16"
            value={newTask.description}
            onChange={e => setNewTask({...newTask, description: e.target.value})}
          />
          <div className="flex gap-2">
            <select 
              className="bg-white/50 border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1"
              value={newTask.target_type}
              onChange={e => setNewTask({...newTask, target_type: e.target.value as any, target_value: e.target.value === 'all' ? null : profile.personal_id})}
            >
              <option value="individual">צוער ספציפי (לפי מס' אישי)</option>
              <option value="team">צוות שלם</option>
              <option value="all">כלל ההשלמה</option>
            </select>
            {newTask.target_type !== 'all' && (
              <input 
                type="text" 
                placeholder={newTask.target_type === 'team' ? "מספר צוות (למשל 3)" : "מספר אישי של צוער"}
                className="bg-white/50 border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1"
                required
                value={newTask.target_value || ''}
                onChange={e => setNewTask({...newTask, target_value: e.target.value})}
              />
            )}
          </div>
          <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 rounded-lg mt-1 transition-colors">
            הקצה משימה
          </button>
        </form>
      )}

      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
        {myActiveTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
            <p>אין לך משימות פתוחות כרגע!</p>
          </div>
        ) : (
          myActiveTasks.map(task => (
            <div key={task.id} className="glass-card p-4 rounded-2xl border-r-4 border-r-orange-400 flex gap-3 group">
              <button 
                onClick={() => handleComplete(task.id)}
                className="text-slate-300 hover:text-emerald-500 transition-colors shrink-0 mt-0.5"
                title="סמן כבוצע"
              >
                <Circle size={22} className="group-hover:hidden" />
                <CheckCircle size={22} className="hidden group-hover:block" />
              </button>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800">{task.title}</h4>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[10px] font-medium text-slate-400">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full">
                    {task.target_type === 'all' ? 'כלל ההשלמה' : task.target_type === 'team' ? `צוות ${task.target_value}` : 'אישי'}
                  </span>
                  {task.deadline && (
                    <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                      <CalendarClock size={12} /> {new Date(task.deadline).toLocaleDateString('he-IL')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
