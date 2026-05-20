import React, { useState, useEffect } from 'react';
import { fetchCadets } from '../services/db';
import type { Cadet } from '../types';
import { Network, Loader2, AlertCircle, Briefcase } from 'lucide-react';

export default function Roles() {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const cdts = await fetchCadets();
      setCadets(cdts);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-sky-500" />
        <span className="font-medium">טוען תפקידי רוחב...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const rolesCadets = cadets.filter(c => c.role && c.role.trim() !== '');

  // Group by role in case multiple cadets share a role, but usually it's one-to-one
  const groupedRoles = rolesCadets.reduce((acc, cadet) => {
    const role = cadet.role!.trim();
    if (!acc[role]) acc[role] = [];
    acc[role].push(cadet);
    return acc;
  }, {} as Record<string, Cadet[]>);

  // Sort roles alphabetically for consistent display
  const sortedRoles = Object.keys(groupedRoles).sort();

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Network className="text-indigo-500" size={32} />
            תפקידי רוחב
          </h2>
          <p className="text-slate-500 text-lg">
            מיפוי בעלי התפקידים בהשלמה
          </p>
        </div>
      </header>

      {sortedRoles.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium text-lg">טרם הוגדרו תפקידי רוחב במערכת</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRoles.map(roleName => (
            <div 
              key={roleName} 
              className="relative flex flex-col rounded-2xl overflow-visible bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md hover:border-indigo-200 group"
            >
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-400 to-sky-400 rounded-t-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="p-5 pt-6 flex flex-col h-full">
                {/* Role Badge */}
                <div className="mb-4 inline-flex self-start items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-bold">
                  <Briefcase size={16} className="text-indigo-500" />
                  {roleName}
                </div>

                <div className="space-y-3 mt-auto">
                  {groupedRoles[roleName].map(cadet => (
                    <div key={cadet.cadet_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-sm">
                        {cadet.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{cadet.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">צוות {cadet.team_number}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
