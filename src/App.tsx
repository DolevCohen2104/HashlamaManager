import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Users, Download, LogOut, CheckCircle2, Gift, Network, Loader2 } from 'lucide-react';
import { initAuth, logout, AppUser } from './auth';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CadetDirectory from './components/CadetDirectory';
import ExportData from './components/ExportData';
import Birthdays from './components/Birthdays';
import Roles from './components/Roles';
import OmniSearch from './components/OmniSearch';
import ServiceRequestForm from './components/ServiceRequestForm';
import LeaveRequestForm from './components/LeaveRequestForm';
import MaintenanceRequestForm from './components/MaintenanceRequestForm';
import LoadingSpinner from './components/LoadingSpinner';
import { formatRole } from './utils';

export default function App() {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');

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
    <div dir="rtl" className="h-[100dvh] w-full bg-mesh text-[#1E293B] font-sans flex flex-col md:flex-row overflow-hidden relative">
      <aside className="hidden md:flex flex-col justify-between w-[260px] m-4 mr-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 text-white shrink-0 z-20">
        <div>
          <div className="mb-8 flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
             <img src="/tikshuv.png" alt="תקשוב" className="w-10 h-10 object-contain drop-shadow-sm" />
             <h1 className="text-xl font-bold tracking-tight">ניהול השלמה</h1>
          </div>
          
          <div className="mb-6">
            <OmniSearch onSelect={setActiveTab} userRole={profile.role} />
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl text-center text-sm shadow-inner mt-8">
           <p className="opacity-60 mb-1">משתמש נוכחי:</p>
           <p className="font-semibold text-sky-100">{profile.full_name}</p>
           <p className="text-xs text-slate-400">({profile.role === 'ממ"ש' && profile.team_number ? `${formatRole(profile.role, profile.gender)} צוות ${profile.team_number}` : formatRole(profile.role, profile.gender)})</p>
           <button onClick={handleLogout} className="mt-4 flex items-center justify-center gap-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 p-2 rounded-xl w-full transition-all font-medium">
              <LogOut size={16} /> התנתק
           </button>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <header className="md:hidden flex-none bg-slate-900/95 backdrop-blur-xl text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-b border-white/10 z-40 relative shrink-0">
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <img src="/tikshuv.png" alt="תקשוב" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />
            <div>
              <h1 className="font-bold text-sm leading-tight">ניהול השלמה</h1>
              <p className="text-xs text-slate-400 leading-tight">
                {profile.full_name}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-rose-400 p-2"><LogOut size={20}/></button>
        </div>
        
        <div className="px-4 pb-4">
          <OmniSearch onSelect={setActiveTab} userRole={profile.role} />
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto w-full z-10 relative">
        {activeTab === 'dashboard' && <Dashboard profile={profile} />}
        {activeTab === 'directory' && <CadetDirectory profile={profile} />}
        {activeTab === 'birthdays' && <Birthdays />}
        {activeTab === 'roles' && <Roles />}
        {activeTab === 'export' && <ExportData profile={profile} />}
        
        {activeTab === 'clinic' && (
          <ServiceRequestForm 
            profile={profile} 
            type={'clinic' as any} 
            onClose={() => setActiveTab('dashboard')} 
          />
        )}
        
        {activeTab === 'maintenance' && (
          <MaintenanceRequestForm
            profile={profile}
            onClose={() => setActiveTab('dashboard')}
          />
        )}
        
        {activeTab === 'leave' && (
          <LeaveRequestForm
            profile={profile}
            onClose={() => setActiveTab('dashboard')}
          />
        )}
      </main>
    </div>
  );
}
