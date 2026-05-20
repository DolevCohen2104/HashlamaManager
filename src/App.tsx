import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Users, Download, LogOut, CheckCircle2 } from 'lucide-react';
import { initAuth, logout, AppUser } from './auth';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CadetDirectory from './components/CadetDirectory';
import ExportData from './components/ExportData';

export default function App() {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'export'>('dashboard');

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
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (needsAuth || !profile) {
    return <Login onLoginComplete={(user) => {
      setProfile(user);
      setNeedsAuth(false);
    }} />;
  }

  return (
    <div dir="rtl" className="h-screen w-full bg-[#F0F2F5] text-[#1E293B] font-sans grid grid-cols-1 md:grid-cols-[260px_1fr] overflow-hidden">
      <aside className="bg-slate-900 text-white p-6 flex flex-col justify-between overflow-y-auto hidden md:flex">
        <div>
          <div className="mb-8 flex items-center gap-3">
             <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-xl text-white">ה</div>
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
           <p className="text-xs text-slate-400">({profile.role === 'ממ"ש' && profile.team_number ? `${profile.role} צוות ${profile.team_number}` : profile.role})</p>
           <button onClick={handleLogout} className="mt-4 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 w-full transition-colors font-medium">
              <LogOut size={16} /> התנתק
           </button>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <header className="md:hidden bg-slate-900 text-white shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-lg text-white">ה</div>
          <h1 className="font-bold">ניהול השלמה</h1>
        </div>
        <button onClick={handleLogout} className="text-red-400 p-2"><LogOut size={20}/></button>
      </header>
      
      {/* Mobile Tabs */}
      <nav className="md:hidden bg-white border-b border-slate-200 shadow-sm flex items-center">
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
        {profile.role !== 'צוער' && (
          <button 
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-xs font-medium border-b-2 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'export' ? 'border-sky-500 text-sky-600 bg-sky-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Download size={18} /> ייצוא
          </button>
        )}
      </nav>

      <main className="flex flex-col gap-6 p-4 md:p-8 overflow-y-auto overflow-x-hidden w-full">
        {activeTab === 'dashboard' && <Dashboard profile={profile} />}
        {activeTab === 'directory' && <CadetDirectory profile={profile} />}
        {activeTab === 'export' && <ExportData profile={profile} />}
      </main>
    </div>
  );
}
