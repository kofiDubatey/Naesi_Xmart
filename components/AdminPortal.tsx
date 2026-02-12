
import React, { useState, useMemo } from 'react';
import { UserProfile, Course, Material, Quiz, AppNotification } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface AdminPortalProps {
  allUsers: UserProfile[];
  allCourses: Course[];
  allMaterials: Material[];
  allQuizzes: Quiz[];
  onImpersonate: (userId: string | null) => void;
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => void;
  onBroadcast: (title: string, message: string) => void;
  awardPoints: (amount: number, reason: string) => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ 
  allUsers, 
  allCourses, 
  allMaterials, 
  allQuizzes, 
  onImpersonate, 
  onUpdateUser,
  onBroadcast,
  awardPoints
}) => {
  const [activeView, setActiveView] = useState<'users' | 'materials' | 'analytics' | 'broadcast' | 'assessments'>('analytics');
  const [userSearch, setUserSearch] = useState('');
  const [matSearch, setMatSearch] = useState('');
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const filteredUsers = useMemo(() => allUsers.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  ), [allUsers, userSearch]);

  const subjectProficiency = useMemo(() => {
    const courseStats: Record<string, { total: number, count: number }> = {};
    allQuizzes.filter(q => q.completed).forEach(q => {
      // Corrected to course_id (snake_case)
      const course = allCourses.find(c => c.id === q.course_id);
      const subject = course ? course.code : 'GEN';
      if (!courseStats[subject]) courseStats[subject] = { total: 0, count: 0 };
      courseStats[subject].total += (q.score || 0);
      courseStats[subject].count += 1;
    });

    return Object.entries(courseStats).map(([name, data]) => ({
      name,
      rating: Math.round(data.total / data.count)
    })).sort((a, b) => b.rating - a.rating);
  }, [allQuizzes, allCourses]);

  const handleAction = async (userId: string, action: 'suspend' | 'elevate') => {
    setIsProcessing(userId + action);
    try {
      const user = allUsers.find(u => u.id === userId);
      if (!user) return;
      if (action === 'suspend') await onUpdateUser(userId, { is_suspended: !user.is_suspended });
      else if (action === 'elevate') await onUpdateUser(userId, { role: user.role === 'admin' ? 'student' : 'admin' });
    } finally { setIsProcessing(null); }
  };

  const sendBroadcast = () => {
    if (!broadcastData.title || !broadcastData.message) return;
    onBroadcast(broadcastData.title, broadcastData.message);
    setBroadcastData({ title: '', message: '' });
    awardPoints(0, "BROADCAST_PROTOCOLS_TRANSMITTED");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Header Controller */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-amber-500/10 border border-amber-500/30 p-8 rounded-[40px] relative overflow-hidden">
        <div className="hud-corner hud-tl border-amber-500"></div>
        <div className="hud-corner hud-br border-amber-500"></div>
        <div>
          <h3 className="text-3xl font-bold font-space text-amber-500 uppercase tracking-tighter">Command Core</h3>
          <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-[0.4em] mt-1">Status: ARCHITECT_LEVEL_AUTH</p>
        </div>
        <div className="flex flex-wrap bg-black/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          {[
            { id: 'analytics', label: 'Neural Pulse', icon: ICONS.Stats },
            { id: 'users', label: 'Identity Matrix', icon: ICONS.Group },
            { id: 'assessments', label: 'Clinical Audit', icon: ICONS.Quiz },
            { id: 'materials', label: 'Vault Registry', icon: ICONS.Materials },
            { id: 'broadcast', label: 'Broadcast', icon: ICONS.Bell }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeView === tab.id ? 'bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeView === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass p-10 rounded-[40px] border border-white/5 bg-slate-900/20 relative">
             <h4 className="text-sm font-bold font-space text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-4">Proficiency Matrix</h4>
             <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={subjectProficiency}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'black', border: '1px solid #f59e0b', borderRadius: '12px' }} />
                      <Bar dataKey="rating" radius={[10, 10, 0, 0]} barSize={40}>
                         {subjectProficiency.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.rating > 80 ? '#22d3ee' : entry.rating > 60 ? '#818cf8' : '#f472b6'} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
          <div className="space-y-6">
             <div className="glass p-8 rounded-[40px] border border-amber-500/20 bg-amber-500/5">
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mb-1">Fleet_Sync_Status</p>
                <p className="text-4xl font-bold font-space text-white">{allUsers.length} Nodes</p>
                <div className="mt-4 flex gap-2">
                   <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[7px] font-bold border border-green-500/20">UPTIME: 99.9%</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeView === 'assessments' && (
        <div className="glass p-10 rounded-[50px] border border-amber-500/20 bg-slate-900/40 animate-in slide-in-from-right-4">
          <div className="flex justify-between items-center mb-8">
             <div>
                <h4 className="text-xl font-bold font-space text-amber-500 uppercase tracking-tighter">Clinical Audit Registry</h4>
                <p className="text-[9px] text-slate-500 uppercase mt-1">Monitoring AI-generated pharmaceutical validation nodes</p>
             </div>
             <span className="px-4 py-2 bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 rounded-full">Global Count: {allQuizzes.length}</span>
          </div>
          
          <div className="space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
            {allQuizzes.map(quiz => (
              <div key={quiz.id} className="p-8 rounded-[35px] border border-white/5 bg-black/40 group hover:border-amber-500/30 transition-all">
                <div className="flex justify-between items-center mb-8">
                   <div>
                     <h5 className="text-white font-bold text-lg uppercase tracking-tight mb-1">{quiz.title}</h5>
                     <div className="flex gap-4">
                        <p className="text-[9px] text-slate-500 uppercase font-mono">Node: {quiz.user_id?.slice(0, 8)}</p>
                        {/* Fixed quiz.courseId -> quiz.course_id */}
                        <p className="text-[9px] text-slate-500 uppercase font-mono">Module: {allCourses.find(c => c.id === quiz.course_id)?.code || 'GEN'}</p>
                     </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-amber-500">{quiz.score ? `${Math.round(quiz.score)}%` : 'PENDING'}</p>
                      <p className="text-[7px] text-slate-600 uppercase font-bold">Student_Score</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quiz.questions.map((q, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 text-[11px] relative overflow-hidden">
                       <span className="absolute top-0 right-0 px-2 py-1 bg-amber-500/10 text-amber-400 text-[7px] font-bold rounded-bl-xl uppercase border-b border-l border-amber-500/20">{q.category}</span>
                       <p className="text-slate-200 font-bold mb-4 pr-12 leading-relaxed">{i+1}. {q.question}</p>
                       <div className="space-y-2 opacity-60">
                          {q.options.map((opt, oi) => (
                             <div key={oi} className={`px-3 py-1.5 rounded-lg border text-[10px] ${oi === q.correctAnswer ? 'bg-green-500/10 border-green-500/30 text-green-400 font-bold' : 'border-white/5'}`}>{opt}</div>
                          ))}
                       </div>
                       <div className="mt-4 pt-4 border-t border-white/5">
                          <p className="text-slate-500 italic"><span className="text-amber-500/50 font-bold not-italic mr-2">LOGIC:</span>{q.explanation}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'users' && (
        <div className="glass rounded-[50px] border border-white/10 overflow-hidden bg-slate-950/40 animate-in slide-in-from-bottom-4">
           <div className="p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <h4 className="text-sm font-bold font-space text-white uppercase tracking-[0.3em]">Identity Matrix</h4>
              <input 
                type="text" 
                placeholder="Query biometrics..." 
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full md:w-96 bg-slate-900 border border-white/10 rounded-2xl px-8 py-3 text-xs text-white focus:border-amber-500 outline-none"
              />
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-white/5">
                    <tr>
                       <th className="px-10 py-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Entity</th>
                       <th className="px-10 py-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                       <th className="px-10 py-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">XP</th>
                       <th className="px-10 py-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {filteredUsers.map(user => (
                       <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-5">
                                <img src={user.avatar} className="w-14 h-14 rounded-2xl border border-white/10" alt="" />
                                <div>
                                   <p className="text-base font-bold text-white uppercase tracking-tight">{user.name}</p>
                                   <p className="text-[10px] text-slate-600 font-mono">{user.email}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-8">
                             <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${user.role === 'super-admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                {user.role}
                             </span>
                          </td>
                          <td className="px-10 py-8">
                             <p className="text-sm font-bold text-cyan-400 font-mono">{user.points.toLocaleString()}</p>
                          </td>
                          <td className="px-10 py-8 text-right">
                             <div className="flex justify-end gap-4 opacity-20 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onImpersonate(user.id)} className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500 hover:text-black transition-all" title="Diagnostic Link"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                <button onClick={() => handleAction(user.id, 'suspend')} className={`p-3 rounded-xl transition-all ${user.is_suspended ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`} title="Suspend"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg></button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeView === 'broadcast' && (
        <div className="max-w-2xl mx-auto glass p-12 rounded-[50px] border border-amber-500/20 bg-amber-500/5 animate-in zoom-in-95">
           <div className="text-center mb-12">
              <ICONS.Bell className="w-12 h-12 text-amber-500 mx-auto mb-6" />
              <h4 className="text-3xl font-bold font-space text-white uppercase tracking-tighter">Mass Signal Broadcast</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2">Transmit system-wide alerts to all active nodes</p>
           </div>
           <div className="space-y-6">
              <input type="text" value={broadcastData.title} onChange={e => setBroadcastData({...broadcastData, title: e.target.value})} placeholder="Signal Header..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none text-sm font-bold uppercase tracking-tight" />
              <textarea rows={6} value={broadcastData.message} onChange={e => setBroadcastData({...broadcastData, message: e.target.value})} placeholder="Signal Data Payload..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none text-sm resize-none" />
              <button onClick={sendBroadcast} disabled={!broadcastData.title || !broadcastData.message} className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-black rounded-3xl font-bold uppercase tracking-[0.4em] text-[11px] shadow-2xl shadow-amber-600/20 transition-all">Initiate Transmission</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
