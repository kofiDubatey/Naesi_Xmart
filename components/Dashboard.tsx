
import React, { useState, useMemo } from 'react';
import { Course, Quiz, Material } from '../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ICONS } from '../constants';

interface DashboardProps {
  courses: Course[];
  quizzes: Quiz[];
  materials: Material[];
  setActiveTab: (tab: any) => void;
  setActiveQuizId: (id: string | null) => void;
  points: number;
}

interface HudCardProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
}

const chartData = [
  { name: 'Mon', score: 40 },
  { name: 'Tue', score: 30 },
  { name: 'Wed', score: 65 },
  { name: 'Thu', score: 45 },
  { name: 'Fri', score: 85 },
  { name: 'Sat', score: 70 },
  { name: 'Sun', score: 95 },
];

const HudCard = ({ children, className = "", title = "" }: HudCardProps) => (
  <div className={`glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group transition-all duration-300 ${className}`} aria-label={title}>
    <div className="hud-corner hud-tl"></div>
    <div className="hud-corner hud-tr"></div>
    <div className="hud-corner hud-bl"></div>
    <div className="hud-corner hud-br"></div>
    {children}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ courses, quizzes, materials, setActiveTab, setActiveQuizId, points }) => {
  const [showTranscript, setShowTranscript] = useState(false);

  const pendingQuizzes = useMemo(() => quizzes.filter(q => !q.completed), [quizzes]);
  const bookmarkedMaterials = useMemo(() => materials.filter(m => m.bookmarked), [materials]);
  const completedQuizzes = useMemo(() => quizzes.filter(q => q.completed), [quizzes]);

  const averageScore = useMemo(() => 
    completedQuizzes.length > 0 
      ? completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length 
      : 0,
    [completedQuizzes]
  );

  const performance = useMemo(() => {
    const score = averageScore;
    if (score >= 90) return { label: 'A+', color: 'text-cyan-400' };
    if (score >= 80) return { label: 'A', color: 'text-cyan-400' };
    if (score >= 70) return { label: 'B', color: 'text-indigo-400' };
    if (score >= 60) return { label: 'C', color: 'text-amber-400' };
    return { label: 'D', color: 'text-pink-400' };
  }, [averageScore]);

  const startQuizNavigation = (quizId: string) => {
    setActiveQuizId(quizId);
    setActiveTab('quizzes');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <HudCard title={`${courses.length} courses active`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
             <ICONS.Materials className="w-16 h-16 text-cyan-400" aria-hidden="true" />
          </div>
          <p className="text-slate-400 text-[10px] mb-1 uppercase tracking-widest font-bold">SYLLABUS_MODULES</p>
          <p className="text-4xl font-space font-bold text-white neon-glow-cyan">{courses.length}</p>
          <p className="text-[10px] text-cyan-400 mt-2 font-bold tracking-tighter">DATA_STREAM: ACTIVE</p>
        </HudCard>
        
        <HudCard title={`${pendingQuizzes.length} pending assessments`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
             <ICONS.Quiz className="w-16 h-16 text-amber-400" aria-hidden="true" />
          </div>
          <p className="text-slate-400 text-[10px] mb-1 uppercase tracking-widest font-bold">NEURAL_ASSESSMENTS</p>
          <p className="text-4xl font-space font-bold text-white neon-glow-indigo">{pendingQuizzes.length}</p>
          <p className="text-[10px] text-amber-400 mt-2 font-bold tracking-tighter">PENDING_CYCLES</p>
        </HudCard>

        <HudCard title={`${points.toLocaleString()} total experience points`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
             <ICONS.Stats className="w-16 h-16 text-indigo-400" aria-hidden="true" />
          </div>
          <p className="text-slate-400 text-[10px] mb-1 uppercase tracking-widest font-bold">XP_ACCUMULATION</p>
          <p className="text-4xl font-space font-bold text-white neon-glow-indigo">{points.toLocaleString()}</p>
          <p className="text-[10px] text-indigo-400 mt-2 font-bold tracking-tighter">SYNAPTIC_LEVEL_UP</p>
        </HudCard>

        <button 
          onClick={() => setShowTranscript(true)}
          className="glass p-6 rounded-2xl border border-cyan-500/30 relative overflow-hidden text-left cursor-pointer group hover:bg-cyan-500/10 transition-all shadow-[0_0_20px_rgba(34,211,238,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-label={`Current performance: ${performance.label}. Click to view transcript.`}
        >
          <div className="hud-corner hud-tl border-cyan-400"></div>
          <div className="hud-corner hud-tr border-cyan-400"></div>
          <div className="hud-corner hud-bl border-cyan-400"></div>
          <div className="hud-corner hud-br border-cyan-400"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-cyan-400 text-[10px] mb-1 uppercase tracking-widest font-bold">PROFICIENCY_RATING</p>
          <p className={`text-5xl font-space font-bold ${performance.color} neon-glow-cyan`}>{performance.label}</p>
          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 font-bold">GET_FULL_LOGS <ICONS.Stats className="w-3 h-3" aria-hidden="true"/></p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <HudCard className="p-0" title="Weekly momentum chart">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div>
              <h3 className="text-lg font-bold font-space text-white uppercase tracking-wider">NEURAL_MOMENTUM</h3>
              <p className="text-[10px] text-cyan-400 font-bold tracking-widest">REALTIME_SYNC_FEED</p>
            </div>
          </div>
          <div className="h-64 p-6 bg-gradient-to-b from-transparent to-cyan-500/5" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #22d3ee', borderRadius: '12px', boxShadow: '0 0 15px rgba(34,211,238,0.2)' }}
                  itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </HudCard>

        <HudCard title="Critical protocols and upcoming tasks">
          <h3 className="text-lg font-bold mb-4 font-space text-white uppercase tracking-wider border-b border-white/5 pb-2">CRITICAL_PROTOCOLS</h3>
          <div className="space-y-4">
            {bookmarkedMaterials.slice(0, 3).map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all group/item">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${m.reminder_time ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-indigo-500/20 text-indigo-400'} rounded-lg group-hover/item:scale-110 transition-transform`}>
                    <ICONS.Bookmark className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-100">{m.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                      {m.reminder_time ? `SYNC_TIME: ${m.reminder_time}` : 'VAULT_REFERENCE'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('bookmarks')} 
                  className="text-[10px] font-bold text-cyan-400 hover:text-white uppercase tracking-widest border border-cyan-500/30 px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
                  aria-label={`Access protocol ${m.title}`}
                >
                  ACCESS
                </button>
              </div>
            ))}
            {pendingQuizzes.slice(0, 2).map(q => (
              <div key={q.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${q.deadline === new Date().toLocaleDateString() ? 'bg-amber-500/10 border-amber-500/40 animate-pulse' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${q.deadline === new Date().toLocaleDateString() ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-100">{q.title}</p>
                    <p className={`text-[10px] uppercase font-bold tracking-tighter ${q.deadline === new Date().toLocaleDateString() ? 'text-amber-500' : 'text-slate-400'}`}>
                      EXPIRATION: {q.deadline}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => startQuizNavigation(q.id)} 
                  className="px-3 py-1 bg-amber-500 text-slate-900 text-[10px] font-bold rounded-lg shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label={`Initialize assessment ${q.title}`}
                >
                  INITIALIZE
                </button>
              </div>
            ))}
            {pendingQuizzes.length === 0 && bookmarkedMaterials.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic font-bold text-xs uppercase tracking-widest">NO_ACTIVE_TASKS_DETECTED</div>
            )}
          </div>
        </HudCard>
      </div>

      <section aria-labelledby="curriculum-stream-title">
        <div className="flex justify-between items-center mb-6">
          <h3 id="curriculum-stream-title" className="text-xl font-bold font-space uppercase tracking-widest text-white border-l-4 border-cyan-500 pl-4">CURRICULUM_STREAM</h3>
          <button 
            onClick={() => setActiveTab('curriculum')}
            className="text-[10px] text-cyan-400 hover:text-white font-bold uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:underline"
            aria-label="Open Curriculum Insights"
          >
            OPEN_CURRICULUM_INSIGHTS →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div 
              key={course.id} 
              onClick={() => setActiveTab('curriculum')}
              className="group glass rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/50 transition-all duration-500 relative cursor-pointer"
            >
              <div className="hud-corner hud-tl"></div>
              <div className="hud-corner hud-tr"></div>
              <div className="hud-corner hud-bl"></div>
              <div className="hud-corner hud-br"></div>
              <div className="h-40 overflow-hidden relative">
                <img src={course.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100" alt={course.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40"></div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-1 rounded border border-cyan-500/30 uppercase font-bold tracking-widest backdrop-blur-md">{course.code}</span>
                  <span className="bg-slate-900/80 text-slate-300 text-[10px] px-2 py-1 rounded border border-white/10 uppercase font-bold tracking-widest">CY_{course.academic_year}</span>
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{course.name}</h4>
                <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest">SECTOR_{course.semester} • {course.term}</p>
                {course.description && (
                  <p className="text-[11px] text-slate-500 mb-4 line-clamp-2 italic leading-relaxed">{course.description}</p>
                )}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden border border-white/5" role="progressbar" aria-valuenow={course.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${course.name} sync progress`}>
                  <div className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-1000" style={{ width: `${course.progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-slate-400">SYNC_PROGRESS</span>
                  <span className="text-white">{course.progress}%</span>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
             <div 
               onClick={() => setActiveTab('materials')}
               className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-50 hover:opacity-100 cursor-pointer transition-opacity"
             >
                <p className="text-xs font-bold uppercase tracking-[0.3em]">Curriculum Database Empty. Initialize Nodes In Academy Vault.</p>
             </div>
          )}
        </div>
      </section>

      {showTranscript && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto animate-in fade-in zoom-in-95" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="transcript-title"
        >
          <div className="glass w-full max-w-2xl p-8 rounded-[40px] border border-cyan-500/30 relative">
            <div className="hud-corner hud-tl border-cyan-400"></div>
            <div className="hud-corner hud-tr border-cyan-400"></div>
            <div className="hud-corner hud-bl border-cyan-400"></div>
            <div className="hud-corner hud-br border-cyan-400"></div>
            
            <button 
              onClick={() => setShowTranscript(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full p-1"
              aria-label="Close Transcript"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)]" aria-hidden="true">
                <ICONS.Stats className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 id="transcript-title" className="text-2xl font-bold font-space text-white uppercase tracking-tighter">NEURAL_TRANSCRIPT</h2>
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">ACADEMIC_LOG_VERIFIED</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-4 rounded-2xl bg-white/5 border-white/10 relative">
                  <div className="hud-corner hud-tl w-2 h-2"></div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-widest">CUMULATIVE_GPA</p>
                  <p className={`text-3xl font-bold font-space ${performance.color} neon-glow-cyan`}>{(averageScore / 25).toFixed(2)} / 4.00</p>
                </div>
                <div className="glass p-4 rounded-2xl bg-white/5 border-white/10 relative">
                  <div className="hud-corner hud-tr w-2 h-2"></div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-widest">ANNUAL_STANDING</p>
                  <p className="text-3xl font-bold font-space text-white tracking-tighter uppercase">DISTINCTION</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-2 mb-4">SECTOR_BREAKDOWN</p>
                {courses.map(course => {
                  const courseAvg = quizzes
                    .filter(q => q.course_id === course.id && q.completed)
                    .reduce((acc, q, _, arr) => acc + (q.score || 0) / arr.length, 0);
                  
                  const grade = courseAvg >= 90 ? { label: 'A+', color: 'text-cyan-400' } :
                               courseAvg >= 80 ? { label: 'A', color: 'text-cyan-400' } :
                               courseAvg >= 70 ? { label: 'B', color: 'text-indigo-400' } :
                               courseAvg >= 60 ? { label: 'C', color: 'text-amber-400' } :
                               { label: 'D', color: 'text-pink-400' };

                  return (
                    <div key={course.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/20 transition-all group/row">
                      <div>
                        <p className="font-bold text-white group-hover/row:text-cyan-400 transition-colors uppercase tracking-tight">{course.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest">{course.code} • SEC_{course.semester}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold font-space ${grade.color}`}>{grade.label}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">ACCURACY: {Math.round(courseAvg)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-white/5 text-center">
                <p className="text-[10px] text-slate-400 italic uppercase tracking-tighter">AUTOMATED_AI_REPORT_GENERATED_BY_NAESIXMART_CORE</p>
                <button 
                  onClick={() => window.print()}
                  className="mt-6 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:border-cyan-500/30 text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  DOWNLOAD_ENCRYPTED_PDF_RECORD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
