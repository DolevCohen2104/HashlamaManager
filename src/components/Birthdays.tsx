import React, { useState, useEffect } from 'react';
import { fetchCadets } from '../services/db';
import type { Cadet } from '../types';
import { Gift, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function Birthdays() {
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
        <span className="font-medium">טוען ימי הולדת...</span>
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

  // Filter cadets with birth_date and group by month
  const groupedBirthdays = cadets.reduce((acc, cadet) => {
    if (!cadet.birth_date) return acc;
    
    // Parse the date safely
    const date = new Date(cadet.birth_date);
    if (isNaN(date.getTime())) return acc;

    const monthIndex = date.getMonth(); // 0-11
    if (!acc[monthIndex]) {
      acc[monthIndex] = [];
    }
    
    acc[monthIndex].push({
      cadet,
      date,
      day: date.getDate()
    });
    
    return acc;
  }, {} as Record<number, { cadet: Cadet, date: Date, day: number }[]>);

  const currentMonth = new Date().getMonth();
  // Create an array of month indices starting from current month (e.g., if May=4, then [4,5,6...11,0,1,2,3])
  const orderedMonthIndices = Array.from({ length: 12 }, (_, i) => (currentMonth + i) % 12);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Gift className="text-rose-500" size={32} />
            ימי הולדת בהשלמה
          </h2>
          <p className="text-slate-500 text-lg">
            כלל ימי ההולדת של צוערי ההשלמה, מסודרים לפי חודשים
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {orderedMonthIndices.map((monthIndex) => {
          const monthName = HEBREW_MONTHS[monthIndex];
          const monthData = groupedBirthdays[monthIndex];
          const isCurrentMonth = monthIndex === currentMonth;

          if (!monthData || monthData.length === 0) return null;

          // Sort by day of month
          monthData.sort((a, b) => a.day - b.day);

          return (
            <div 
              key={index} 
              className={`flex flex-col rounded-2xl overflow-hidden shadow-sm border-2 transition-all hover:shadow-md ${
                isCurrentMonth 
                  ? 'border-rose-400 bg-rose-50/30' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`py-3 px-4 flex items-center justify-between ${
                isCurrentMonth ? 'bg-rose-400 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CalendarIcon size={18} />
                  {monthName}
                </h3>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                  isCurrentMonth ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {monthData.length} חוגגים
                </span>
              </div>
              
              <div className="p-4 space-y-3 flex-1">
                {monthData.map(({ cadet, day }) => (
                  <div 
                    key={cadet.cadet_id} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-rose-100 to-orange-100 rounded-full flex flex-col items-center justify-center text-rose-600 border border-rose-200 shadow-inner">
                      <span className="text-sm font-medium leading-none mb-0.5">יום</span>
                      <span className="text-lg font-black leading-none">{day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate text-base">{cadet.full_name}</p>
                      <p className="text-sm text-slate-500">צוות {cadet.team_number}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {Object.keys(groupedBirthdays).length === 0 && !loading && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <Gift size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium text-lg">אין נתוני ימי הולדת במערכת</p>
        </div>
      )}
    </div>
  );
}
