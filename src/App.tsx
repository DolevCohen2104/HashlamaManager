import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Users, Download, LogOut, CheckCircle2, Gift, Network, Loader2 } from 'lucide-react';
import { initAuth, logout, AppUser } from './auth';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CadetDirectory from './components/CadetDirectory';
import ExportData from './components/ExportData';
import Birthdays from './components/Birthdays';
import Roles from './components/Roles';
import LoadingSpinner from './components/LoadingSpinner';
import { formatRole } from './utils';

export default function App() {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'birthdays' | 'roles' | 'export'>('dashboard');

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setProfile(user);
        setNeedsAuth(false);
        setIsLoading(false);
      },
      () => {
        setProfile(null);
        setNeedsAuth(true);
        setIsLoading(false);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setNeedsAuth(true);
  };

  if (isLoading) {
    return <LoadingSpinner text="בודק גישה..." />;
  }

  if (needsAuth || !profile) {
    return <Login onLoginComplete={(user) => {
      setProfile(user);
      setNeedsAuth(false);
    }} />;
  }

  return (
    <div dir="rtl" className="h-[100dvh] w-full bg-[#F0F2F5] text-[#1E293B] font-sans flex flex-col md:grid md:grid-cols-[260px_1fr] overflow-hidden">
      <aside className="bg-slate-900 text-white p-6 flex flex-col justify-between overflow-y-auto hidden md:flex">
        <div>
          <div className="mb-8 flex items-center gap-3">
             <img src="/tikshuv.png" alt="תקשוב" className="w-10 h-10 object-contain drop-shadow-sm" />
             <h1 className="text-xl font-bold tracking-tight">ניהול השלמה</h1>
          </div>
          <nav>
            <div 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'bg-slate-700 border-r-4 border-sky-400' : 'hover:bg-slate-800'}`}
            >
              <LayoutDashboard size={20} className="ml-3 opacity-70" />
              <span>לו"ז יומי</span>
            </div>
            
            <div 
              onClick={() => setActiveTab('directory')}
              className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer transition-colors ${activeTab === 'directory' ? 'bg-slate-700 border-r-4 border-sky-400' : 'hover:bg-slate-800'}`}
            >
              <Users size={20} className="ml-3 opacity-70" />
              <span>ספר השלמה</span>
            </div>

            <div 
              onClick={() => setActiveTab('birthdays')}
              className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer transition-colors ${activeTab === 'birthdays' ? 'bg-slate-700 border-r-4 border-sky-400' : 'hover:bg-slate-800'}`}
            >
              <Gift size={20} className="ml-3 opacity-70" />
              <span>ימי הולדת</span>
            </div>

            <div 
              onClick={() => setActiveTab('roles')}
              className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer transition-colors ${activeTab === 'roles' ? 'bg-slate-700 border-r-4 border-sky-400' : 'hover:bg-slate-800'}`}
            >
              <Network size={20} className="ml-3 opacity-70" />
              <span>תפקידי רוחב</span>
            </div>
            
            {profile.role !== 'צוער' && (
              <div 
                onClick={() => setActiveTab('export')}
                className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer transition-colors ${activeTab === 'export' ? 'bg-slate-700 border-r-4 border-sky-400' : 'hover:bg-slate-800'}`}
              >
                <Download size={20} className="ml-3 opacity-70" />
                <span>ייצוא נתונים</span>
              </div>
            )}
          </nav>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl text-center text-sm">
           <p className="opacity-60 mb-1">משתמש נוכחי:</p>
           <p className="font-semibold">{profile.full_name}</p>
           <p className="text-xs text-slate-400">({profile.role === 'ממ"ש' && profile.team_number ? `${formatRole(profile.role, profile.gender)} צוות ${profile.team_number}` : formatRole(profile.role, profile.gender)})</p>
           <button onClick={handleLogout} className="mt-4 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 w-full transition-colors font-medium">
              <LogOut size={16} /> התנתק
           </button>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <header className="md:hidden flex-none h-16 bg-slate-900 text-white shadow-md px-4 flex items-center justify-between z-40 relative shrink-0">
        <div className="flex items-center gap-3">
          <img src="/tikshuv.png" alt="תקשוב" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />
          <div>
            <h1 className="font-bold text-sm leading-tight">ניהול השלמה</h1>
            <p className="text-xs text-slate-400 leading-tight">
              {profile.full_name}
              {profile.role && <span className="mr-1 text-sky-400">• {profile.role === 'ממ"ש' && profile.team_number ? `${formatRole(profile.role, profile.gender)} צוות ${profile.team_number}` : formatRole(profile.role, profile.gender)}</span>}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-red-400 p-2"><LogOut size={20}/></button>
      </header>
      
      {/* Mobile Tabs - Fixed at bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center pb-safe">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'border-sky-500 text-sky-600 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <LayoutDashboard size={18} /> לו"ז יומי
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'directory' ? 'border-sky-500 text-sky-600 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Users size={18} /> ספר השלמה
        </button>
        <button 
          onClick={() => setActiveTab('birthdays')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'birthdays' ? 'border-sky-500 text-sky-600 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Gift size={18} /> ימי הולדת
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'roles' ? 'border-sky-500 text-sky-600 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Network size={18} /> תפקידים
        </button>
        {profile.role !== 'צוער' && (
          <button 
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-xs font-medium border-b-2 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'export' ? 'border-sky-500 text-sky-600 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Download size={18} /> ייצוא
          </button>
        )}
      </nav>

      <main className="flex-1 flex flex-col gap-6 p-4 md:p-8 pb-20 md:pb-12 overflow-y-auto overflow-x-hidden w-full">
        {activeTab === 'dashboard' && <Dashboard profile={profile} />}
        {activeTab === 'directory' && <CadetDirectory profile={profile} />}
        {activeTab === 'birthdays' && <Birthdays />}
        {activeTab === 'roles' && <Roles />}
        {activeTab === 'export' && <ExportData profile={profile} />}
      </main>
    </div>
  );
}
