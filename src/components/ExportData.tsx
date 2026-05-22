import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import type { UserProfile, Cadet } from '../types';
import { fetchCadets } from '../services/db';

interface Props {
  profile: UserProfile;
}

const COLUMNS = [
  { id: 'full_name', label: 'שם מלא' },
  { id: 'personal_id', label: 'מספר אישי' },
  { id: 'team_number', label: 'צוות' },
  { id: 'phone_number', label: 'טלפון' },
  { id: 'birth_date', label: 'תאריך לידה' },
  { id: 'role', label: 'תפקיד בהשלמה' }
] as const;

export default function ExportData({ profile }: Props) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(COLUMNS.map(c => c.id)));
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchCadets();
    setCadets(data);
    setLoading(false);
  };

  const toggleColumn = (id: string) => {
    const next = new Set(selectedColumns);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedColumns(next);
  };

  const handleExport = () => {
    const filteredCadets = selectedTeam === 'all' 
      ? cadets 
      : cadets.filter(c => c.team_number?.toString() === selectedTeam);

    if (filteredCadets.length === 0) {
      alert('אין נתונים לייצוא');
      return;
    }

    // Build CSV Content
    const columnsToExport = COLUMNS.filter(col => selectedColumns.has(col.id));
    
    // Add BOM for Excel UTF-8 encoding
    let csvContent = '\uFEFF'; 
    
    // Headers
    csvContent += columnsToExport.map(col => `"${col.label}"`).join(',') + '\n';
    
    // Rows
    filteredCadets.forEach(cadet => {
      const row = columnsToExport.map(col => {
        let val = cadet[col.id as keyof Cadet] || '';
        if (col.id === 'birth_date' && val) {
          val = new Date(val).toLocaleDateString('he-IL');
        }
        // Escape quotes
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `נתוני_השלמה_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Only plain cadets (role === 'צוער') cannot access export
  if (profile.role === 'צוער') {
    return null;
  }

  return (
    <div className="flex flex-col h-full mx-auto w-full max-w-4xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Download className="text-sky-500" size={28} />
            ייצוא נתונים
          </h2>
          <p className="text-slate-500 mt-1">הפקת דוחות נתונים ומצבת כוח אדם</p>
        </div>
      </div>

      <div className="glass-card text-right rounded-2xl p-6 shadow-sm">
        
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">1. בחירת אוכלוסייה</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedTeam('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTeam === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              כל ההשלמה
            </button>
            {['1','2','3','4','5','6','7','8'].map(team => (
              <button
                key={team}
                onClick={() => setSelectedTeam(team)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTeam === team ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                צוות {team}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">2. בחירת עמודות לייצוא</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {COLUMNS.map(col => {
              const isSelected = selectedColumns.has(col.id);
              return (
                <div 
                  key={col.id} 
                  onClick={() => toggleColumn(col.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50/50 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {isSelected ? <CheckSquare size={20} className="text-blue-500" /> : <Square size={20} className="text-slate-400" />}
                  <span className="font-medium">{col.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            disabled={loading || selectedColumns.size === 0}
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            ייצוא קובץ Excel (CSV)
          </button>
        </div>
      </div>
      
    </div>
  );
}
