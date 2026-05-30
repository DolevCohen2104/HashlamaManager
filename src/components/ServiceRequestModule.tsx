import React, { useState } from 'react';
import type { UserProfile } from '../types';
import MaintenanceRequestForm from './MaintenanceRequestForm';
import ServiceRequestForm from './ServiceRequestForm';
import LeaveRequestForm from './LeaveRequestForm';
import ServiceRequestsManager from './ServiceRequestsManager';
import { PenTool, CalendarOff, Cross, ArrowRight, FilePlus, LayoutList } from 'lucide-react';

interface Props {
  profile: UserProfile;
  type: 'maintenance' | 'clinic' | 'leave';
  onClose: () => void;
}

const TYPE_CONFIG = {
  maintenance: { title: 'תקלות בינוי ותשתיות', icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-50', isManager: (p: UserProfile) => p.role === 'מה"מ' || p.specific_role === 'קל"ג' },
  leave: { title: 'בקשות יציאה', icon: CalendarOff, color: 'text-indigo-500', bg: 'bg-indigo-50', isManager: (p: UserProfile) => p.role === 'מה"מ' || p.role === 'ממ"ש' || p.role === 'מפק"צ' },
  clinic: { title: 'בקשות חופ"ל / רופא', icon: Cross, color: 'text-rose-500', bg: 'bg-rose-50', isManager: (p: UserProfile) => p.role === 'מה"מ' || p.specific_role === 'קמב"צ' }
};

export default function ServiceRequestModule({ profile, type, onClose }: Props) {
  const config = TYPE_CONFIG[type];
  const isManager = config.isManager(profile);
  const isViewer = ['מפק"צ', 'סמק"ס', 'מק"ס'].includes(profile.role);
  
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>(isViewer ? 'manage' : 'create');

  const renderForm = () => {
    switch (type) {
      case 'maintenance': return <MaintenanceRequestForm profile={profile} onClose={onClose} />;
      case 'clinic': return <ServiceRequestForm profile={profile} type="clinic" onClose={onClose} />;
      case 'leave': return <LeaveRequestForm profile={profile} onClose={onClose} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up pb-12">
      <button onClick={onClose} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowRight size={18} /> חזור לדף הבית
      </button>

      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-sm font-semibold sticky top-0 z-10 shadow-sm border border-slate-200">
        {!isViewer && (
          <button 
            onClick={() => setActiveTab('create')} 
            className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${activeTab === 'create' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FilePlus size={16} /> פתיחת בקשה חדשה
          </button>
        )}
        <button 
          onClick={() => setActiveTab('manage')} 
          className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${activeTab === 'manage' ? `bg-white ${config.color} shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LayoutList size={16} /> {(isManager || isViewer) ? 'ניהול בקשות' : 'סטטוס הבקשות שלי'}
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'create' && !isViewer ? renderForm() : (
          <ServiceRequestsManager 
            profile={profile} 
            filterType={type} 
            isManager={isManager}
            isViewer={isViewer}
            teamFilter={(profile.role === 'מפק"צ' || (type === 'leave' && profile.role === 'ממ"ש')) ? profile.team_number : 'all'}
          />
        )}
      </div>
    </div>
  );
}
