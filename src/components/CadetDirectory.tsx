import React, { useState, useEffect } from 'react';
import { Users, Phone, Calendar, UserCheck, Plus, Trash2, ChevronDown, ChevronLeft } from 'lucide-react';
import type { UserProfile, Cadet } from '../types';
import { fetchCadets, addCadet, deleteCadet } from '../services/db';

interface Props {
  profile: UserProfile;
}

export default function CadetDirectory({ profile }: Props) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [expandedCadet, setExpandedCadet] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newCadet, setNewCadet] = useState<Partial<Cadet>>({});

  useEffect(() => {
    loadCadets();
    if (profile.role === 'mammash') {
      setExpandedTeam(profile.team_number);
    }
  }, [profile]);

  const loadCadets = async () => {
    setLoading(true);
    const data = await fetchCadets();
    setCadets(data);
    setLoading(false);
  };

  const isMaham = profile.role === 'מה"מ';
  const isMammash = profile.role === 'ממ"ש';
  const isRohav = profile.role !== 'מה"מ' && profile.role !== 'ממ"ש' && profile.role !== 'צוער';

  const visibleTeams = isMammash && profile.team_number ? [profile.team_number] : ['1', '2', '3', '4', '5', '6', '7', '8'];

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCadet.full_name || !newCadet.personal_id || !newCadet.team_number) return;
    
    await addCadet(newCadet as Omit<Cadet, 'cadet_id'>);
    setIsAdding(false);
    setNewCadet({});
    loadCadets();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('למחוק צוער זה מסעיף השלמה?')) return;
    await deleteCadet(id);
    loadCadets();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-blue-500" size={28} />
            ספר השלמה
          </h2>
          <p className="text-slate-500 mt-1">מצבת כוח אדם ופרטי חיילים</p>
        </div>
        
        {isMaham && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm self-start"
          >
            <Plus size={18} />
            הוסף צוער
          </button>
        )}
      </div>

      {isMaham && isAdding && (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-8 shadow-sm">
          <h3 className="font-semibold text-lg mb-4 text-slate-800">הוספת צוער חדש</h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input 
              required
              placeholder="שם מלא"
              className="px-3 py-2 border border-slate-300 rounded-md"
              value={newCadet.full_name || ''}
              onChange={e => setNewCadet({...newCadet, full_name: e.target.value})}
            />
            <input 
              required
              placeholder="מספר אישי"
              className="px-3 py-2 border border-slate-300 rounded-md"
              value={newCadet.personal_id || ''}
              onChange={e => setNewCadet({...newCadet, personal_id: e.target.value})}
            />
            <select 
              required
              className="px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-700"
              value={newCadet.team_number || ''}
              onChange={e => setNewCadet({...newCadet, team_number: e.target.value})}
            >
              <option value="" disabled>בחר צוות...</option>
              {['1','2','3','4','5','6','7','8'].map(t => <option key={t} value={t}>צוות {t}</option>)}
            </select>
            <input 
              placeholder="טלפון ליצירת קשר"
              className="px-3 py-2 border border-slate-300 rounded-md"
              value={newCadet.phone_number || ''}
              onChange={e => setNewCadet({...newCadet, phone_number: e.target.value})}
            />
            <input 
              type="date"
              className="px-3 py-2 border border-slate-300 rounded-md text-slate-700"
              value={newCadet.birth_date || ''}
              onChange={e => setNewCadet({...newCadet, birth_date: e.target.value})}
            />
            <select 
              className="px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-700"
              value={newCadet.role || 'צוער'}
              onChange={e => setNewCadet({...newCadet, role: e.target.value})}
            >
              <option value="צוער">צוער</option>
              <option value='ממ"ש'>ממ"ש</option>
              <option value='מה"מ'>מה"מ</option>
              <option value="א' סיור בינה">א' סיור בינה</option>
              <option value="א' סיור ספירה">א' סיור ספירה</option>
              <option value='קל"ג התנדבויות'>קל"ג התנדבויות</option>
              <option value='קל"ג'>קל"ג</option>
              <option value='קמב"צ'>קמב"צ</option>
              <option value='קח"ן'>קח"ן</option>
              <option value='קה"ד'>קה"ד</option>
              <option value='קד"ת'>קד"ת</option>
              <option value='קא"ג'>קא"ג</option>
              <option value="ק' נשק">ק' נשק</option>
              <option value='ק הגנ"ש'>ק' הגנ"ש</option>
              <option value="מפקדת האקתון">מפקדת האקתון</option>
            </select>
            
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md font-medium"
              >
                ביטול
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium shadow-sm"
              >
                שמור צוער
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {visibleTeams.map(team => {
          const teamCadets = cadets.filter(c => c.team_number === team);
          if (teamCadets.length === 0 && !isMaham) return null; // Only maham sees empty teams
          
          const isExpanded = expandedTeam === team || isMammash; // Mammash team is always expanded
          
          return (
            <div key={team} className="bg-white border text-right border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => !isMammash && setExpandedTeam(isExpanded ? null : team)}
                className={`w-full p-4 flex items-center justify-between transition-colors focus:outline-none ${
                  isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50'
                } ${isMammash ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-lg">
                    {team}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">צוות {team}</h3>
                    <p className="text-sm text-slate-500">{teamCadets.length} צוערים רשומים</p>
                  </div>
                </div>
                {!isMammash && (
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronLeft size={20} />}
                  </div>
                )}
              </button>
              
              {isExpanded && (
                <div className="p-2 space-y-2 bg-slate-50">
                  {teamCadets.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      אין צוערים רשומים בצוות זה.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {teamCadets.map(cadet => {
                        const isCadetExpanded = expandedCadet === cadet.cadet_id;
                        
                        return (
                          <div 
                            key={cadet.cadet_id} 
                            onClick={() => setExpandedCadet(isCadetExpanded ? null : cadet.cadet_id)}
                            className={`border transition-all duration-200 rounded-lg bg-white overflow-hidden cursor-pointer ${
                              isCadetExpanded ? 'border-blue-300 ring-1 ring-blue-300 shadow-md col-span-1 md:col-span-2 lg:col-span-3' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow'
                            }`}
                          >
                            <div className="p-3 flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-slate-800">{cadet.full_name}</h4>
                                <p className="text-sm text-slate-500">{cadet.personal_id}</p>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400">
                                {isMaham && (
                                  <button onClick={(e) => handleDelete(cadet.cadet_id, e)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded">
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                {isCadetExpanded ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
                              </div>
                            </div>
                            
                            {isCadetExpanded && (
                              <div className="px-4 pb-4 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                  <Phone size={16} className="text-slate-400" />
                                  <span className="text-sm text-slate-700">{cadet.phone_number || 'לא עודכן'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar size={16} className="text-slate-400" />
                                  <span className="text-sm text-slate-700">{cadet.birth_date ? new Date(cadet.birth_date).toLocaleDateString('he-IL') : 'לא עודכן'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <UserCheck size={16} className="text-slate-400" />
                                  <span className="text-sm text-slate-700">{cadet.role || 'צוער'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
