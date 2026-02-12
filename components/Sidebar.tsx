
import React, { useState, memo } from 'react';
import { ICONS } from '../constants';
import { supabase } from '../supabaseClient';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  points: number;
  isSuperAdmin?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, points, isSuperAdmin }) => {
  const [logoError, setLogoError] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Neural Hub', icon: ICONS.Dashboard },
    { id: 'materials', label: 'Academy Vault', icon: ICONS.Materials },
    { id: 'curriculum', label: 'Curriculum Stream', icon: ICONS.Stats },
    { id: 'nexus', label: 'Nexus Chat', icon: ICONS.Consultant },
    { id: 'guides', label: 'Study Protocols', icon: ICONS.Stats },
    { id: 'bookmarks', label: 'Critical Vault', icon: ICONS.Bookmark },
    { id: 'quizzes', label: 'Assessments', icon: ICONS.Quiz },
    { id: 'groups', label: 'Peer Sync', icon: ICONS.Group },
    { id: 'settings', label: 'Timeline & Config', icon: ICONS.Settings },
  ];

  if (isSuperAdmin) {
    menuItems.push({ id: 'admin', label: 'Command Core', icon: ICONS.Consultant });
  }

  const handleSignOut = async () => {
    setIsDisconnecting(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during neural disconnect:", error);
      setIsDisconnecting(false);
    }
  };

  const level = Math.floor(points / 500) + 1;
  const progressToNextLevel = ((points % 500) / 500) * 100;

  return (
    <aside className="w-20 md:w-64 glass border-r border-white/5 h-screen sticky top-0 flex flex-col items-center md:items-start transition-all duration-300 z-50" role="navigation" aria-label="Main Navigation">
      <div className="p-6 w-full flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/10 overflow-hidden ${logoError ? 'bg-gradient-to-br from-cyan-400 to-blue-600' : 'bg-white'}`}>
          {!logoError ? (
            <img 
              src="logo.png" 
              alt="Naesi Logo" 
              className="w-full h-full object-cover" 
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="font-bold text-xl text-slate-900 font-space" aria-hidden="true">NX</span>
          )}
        </div>
        <span className="hidden md:block font-space font-bold text-xl tracking-wider uppercase">Naesi Xmart</span>
      </div>

      <nav className="mt-6 flex-1 w-full space-y-2 px-3 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              activeTab === item.id 
                ? item.id === 'admin' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent text-amber-500 border-l-4 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'bg-gradient-to-r from-cyan-500/20 to-transparent text-cyan-400 border-l-4 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110`} aria-hidden="true" />
            <span className="hidden md:block font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 w-full space-y-4">
        <div className="hidden md:block glass rounded-2xl p-4 text-xs border border-white/5 bg-slate-900/40" aria-label={`Level ${level} progress: ${Math.round(progressToNextLevel)} percent`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 font-bold uppercase tracking-widest">Level {level}</span>
            <span className="text-cyan-400 font-mono" aria-hidden="true">{Math.round(progressToNextLevel)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.3)]" 
              style={{ width: `${progressToNextLevel}%` }}
            ></div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isDisconnecting}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 group border border-transparent hover:border-pink-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          aria-label="Logout"
        >
          {isDisconnecting ? (
            <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent animate-spin rounded-full mx-auto md:mx-0"></div>
          ) : (
            <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          <span className="hidden md:block font-bold uppercase text-[10px] tracking-[0.2em]">
            {isDisconnecting ? 'Disconnecting...' : 'Terminate Link'}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default memo(Sidebar);
