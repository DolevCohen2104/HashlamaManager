import React, { useState, useEffect, useRef } from 'react';
import { Search, PenTool, CalendarOff, Cross, ArrowLeft } from 'lucide-react';

const MODULES = [
  { id: 'maintenance', title: 'תקלות בינוי ותשתיות', keywords: ['תקלה', 'בינוי', 'שבור', 'תיקון', 'מזגן', 'אור'], icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'leave', title: 'בקשת יציאה', keywords: ['חופש', 'יציאה', 'אפטר', 'בית', 'אישור'], icon: CalendarOff, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'clinic', title: 'בקשת חופ"ל / רופא', keywords: ['חופל', 'רופא', 'חולה', 'מרפאה', 'פטור'], icon: Cross, color: 'text-rose-500', bg: 'bg-rose-50' },
  // Adding old tabs to search as per specs
  { id: 'directory', title: 'ספר השלמה', keywords: ['ספר', 'טלפון', 'צוערים', 'רשימה'], icon: Search, color: 'text-sky-500', bg: 'bg-sky-50' },
  { id: 'roles', title: 'תפקידי רוחב', keywords: ['תפקידים', 'רוחב', 'צוות'], icon: Search, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'birthdays', title: 'ימי הולדת', keywords: ['יום הולדת', 'מזל טוב'], icon: Search, color: 'text-pink-500', bg: 'bg-pink-50' },
  { id: 'export', title: 'ייצוא נתונים', keywords: ['ייצוא', 'דוח', 'אקסל'], icon: Search, color: 'text-blue-500', bg: 'bg-blue-50', minRole: 'mammash' }
];

interface Props {
  onSelect: (moduleId: string) => void;
  userRole: string;
  specificRole?: string;
}

export default function OmniSearch({ onSelect, userRole, specificRole }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter modules based on query and role
  const filteredModules = MODULES.filter(m => {
    if (m.minRole === 'mammash' && userRole === 'צוער') return false;

    if (!query) return true; // Show all when focused and empty, or we can show top ones
    
    const searchTerms = query.toLowerCase().split(' ');
    const searchableText = [m.title, ...m.keywords].join(' ').toLowerCase();
    
    return searchTerms.every(term => searchableText.includes(term));
  });

  return (
    <div className="relative w-full max-w-xl mx-auto z-50">
      <div 
        className={`flex items-center bg-white rounded-full border transition-all ${isOpen ? 'border-sky-400 shadow-lg ring-4 ring-sky-100' : 'border-slate-200 shadow-sm hover:border-sky-300'}`}
      >
        <Search className="text-slate-400 ml-3 mr-4" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="חפש טופס, בקשה או מסך..."
          className="w-full bg-transparent py-3.5 outline-none text-slate-800 placeholder:text-slate-400 font-medium"
        />
        {isOpen && (
          <button 
            onClick={() => { setIsOpen(false); setQuery(''); }}
            className="p-2 mr-2 ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-slide-down">
            {filteredModules.length > 0 ? (
              <div className="max-h-[60vh] overflow-y-auto p-2">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  תוצאות מוצעות
                </div>
                {filteredModules.map(mod => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        onSelect(mod.id);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-right group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.bg} ${mod.color} group-hover:scale-110 transition-transform`}>
                        <Icon size={20} />
                      </div>
                      <span className="font-semibold text-slate-700">{mod.title}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                לא נמצאו מודולים מתאימים.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
