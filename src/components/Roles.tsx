import React, { useState, useEffect } from 'react';
import { fetchCadets } from '../services/db';
import type { Cadet } from '../types';
import { Network, Loader2, AlertCircle, Briefcase, Users, Star, Search, MessageCircle } from 'lucide-react';
import { getWhatsAppLink, formatRole } from '../utils';

export default function Roles() {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full animate-pulse-soft">
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

  // Filter only cadets with role defined, not empty, and not 'צוער'
  const rolesCadets = cadets.filter(c => {
    if (!c.role || c.role.trim() === '' || c.role.trim() === 'צוער') return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.full_name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
    }
    return true;
  });

  // Split by hierarchy
  const maham = rolesCadets.filter(c => c.role.trim() === 'מה"מ');
  
  const mammashim = rolesCadets.filter(c => c.role.trim() === 'ממ"ש').sort((a, b) => {
    const tA = parseInt(a.team_number) || 0;
    const tB = parseInt(b.team_number) || 0;
    return tA - tB;
  });

  const otherRolesCadets = rolesCadets.filter(c => c.role.trim() !== 'מה"מ' && c.role.trim() !== 'ממ"ש');

  // Group other roles
  const groupedOtherRoles = otherRolesCadets.reduce((acc, cadet) => {
    const role = cadet.role!.trim();
    if (!acc[role]) acc[role] = [];
    acc[role].push(cadet);
    return acc;
  }, {} as Record<string, Cadet[]>);

  // Sort other roles alphabetically for consistent display
  const sortedOtherRoles = Object.keys(groupedOtherRoles).sort();

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-20 md:pb-0 animate-fade-in">
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
        
        <div className="relative w-full md:w-72 mt-4 md:mt-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="חיפוש לפי שם או תפקיד..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />
        </div>
      </header>

      {rolesCadets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium text-lg">טרם הוגדרו תפקידי רוחב במערכת</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          
          {/* Maham Section */}
          {maham.length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
              <div className="flex flex-col items-center">
                <div className="bg-indigo-600 text-white px-10 py-6 rounded-2xl shadow-lg border border-indigo-500 text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                    <Star size={48} />
                  </div>
                  <h3 className="font-bold text-lg text-indigo-200 mb-2">
                    {maham.length > 0 && maham[0].gender === 'female' ? 'מפקדת ההשלמה (מה"מית)' : 'מפקד ההשלמה (מה"מ)'}
                  </h3>
                  {maham.map(m => (
                    <div key={m.cadet_id} className="flex flex-col items-center">
                      <div className="text-3xl font-black mb-2">{m.full_name}</div>
                      {m.phone_number && (
                        <a 
                          href={getWhatsAppLink(m.phone_number)}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-emerald-300 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
                          title="שלח הודעת וואטסאפ"
                        >
                          <MessageCircle size={18} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mammashim Section */}
          {mammashim.length > 0 && (
            <div className="bg-white/50 rounded-3xl p-6 border border-slate-200/60 shadow-sm animate-slide-up" style={{ animationDelay: '50ms' }}>
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center justify-center gap-2">
                <Users size={22} className="text-sky-500" /> מפקדי הצוותים (ממ"שים)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {mammashim.map(m => (
                  <div key={m.cadet_id} className="bg-white border-2 border-sky-100 rounded-xl p-4 flex flex-col items-center text-center shadow-sm hover:border-sky-300 transition-colors">
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center font-black text-xl mb-3 shadow-inner">
                      {m.team_number}
                    </div>
                    <span className="font-bold text-slate-800 leading-tight text-sm mb-1">{m.full_name}</span>
                    <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full mb-3">{formatRole('ממ"ש', m.gender)} צוות {m.team_number}</span>
                    {m.phone_number && (
                      <a 
                        href={getWhatsAppLink(m.phone_number)}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-auto text-emerald-500 bg-emerald-50 p-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                        title="שלח הודעת וואטסאפ"
                      >
                        <MessageCircle size={16} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Roles Section */}
          {sortedOtherRoles.length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 px-2">
                <Briefcase size={22} className="text-rose-500" /> תפקידי רוחב מקצועיים
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {sortedOtherRoles.map(roleName => (
                  <div 
                    key={roleName} 
                    className="relative flex flex-col rounded-2xl overflow-visible bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md hover:border-rose-200 group"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-400 to-orange-400 rounded-t-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="p-5 pt-6 flex flex-col">
                      <div className="mb-4 inline-flex self-start items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 font-bold">
                        <Briefcase size={16} className="text-rose-500" />
                        {groupedOtherRoles[roleName].length === 1 ? formatRole(roleName, groupedOtherRoles[roleName][0].gender) : roleName}
                      </div>

                      <div className="space-y-3 mt-auto">
                        {groupedOtherRoles[roleName].map(cadet => (
                          <div key={cadet.cadet_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-sm">
                              {cadet.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 leading-tight">{cadet.full_name}</p>
                              {cadet.team_number && <p className="text-xs text-slate-500 mt-0.5">צוות {cadet.team_number}</p>}
                            </div>
                            {cadet.phone_number && (
                              <a 
                                href={getWhatsAppLink(cadet.phone_number)}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mr-auto text-emerald-500 bg-emerald-50 p-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                                title="שלח הודעת וואטסאפ"
                              >
                                <MessageCircle size={16} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
