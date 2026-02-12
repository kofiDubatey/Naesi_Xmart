
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { supabase, IS_CONFIGURED, configureSupabaseManual } from './supabaseClient';
import { Course, Material, Quiz, StudyGroup, AppNotification, UserProfile, NotificationSettings, QuizSettings, StudyGuide, TemporalEvent } from './types';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ProfileModal from './components/ProfileModal';

// Lazy loaded components
const Dashboard = lazy(() => import('./components/Dashboard'));
const CourseManager = lazy(() => import('./components/CourseManager'));
const QuizModule = lazy(() => import('./components/QuizModule'));
const GroupHub = lazy(() => import('./components/GroupHub'));
const BookmarksView = lazy(() => import('./components/BookmarksView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const StudyGuidesView = lazy(() => import('./components/StudyGuidesView'));
const NexusChat = lazy(() => import('./components/NexusChat'));
const CurriculumView = lazy(() => import('./components/CurriculumView'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));

const SUPER_ADMIN_EMAIL = 'kofidugbatey59@gmail.com';
const ADMIN_NAME = 'Kofi Dugbatey';

const ViewLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-pulse" role="status">
    <div className="w-16 h-16 border-b-2 border-cyan-500 rounded-full animate-spin mb-4"></div>
    <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.4em]">Synchronizing_View_Data...</p>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'materials' | 'nexus' | 'guides' | 'quizzes' | 'groups' | 'bookmarks' | 'settings' | 'curriculum' | 'admin'>('dashboard');
  
  // Manual Config State
  const [manualUrl, setManualUrl] = useState('');
  const [manualKey, setManualKey] = useState('');

  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [temporalEvents, setTemporalEvents] = useState<TemporalEvent[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

  const [settings, setSettings] = useState<NotificationSettings>({
    deadlines: true, reminders: true, achievements: true, system: true, dailyDigest: false, digestTime: '08:00', quietMode: false,
  });

  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    defaultQuestionCount: 5, preferredDifficulty: 'standard',
  });

  const [showProfile, setShowProfile] = useState(false);
  const isSuperAdmin = profile?.role === 'super-admin';
  const effectiveUserId = impersonatedUserId || session?.user?.id;

  const addNotification = useCallback((notif: AppNotification) => {
    setNotifications(prev => [notif, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 5000);
  }, []);

  const addError = useCallback((title: string, message: string) => {
    addNotification({ id: `err-${Date.now()}`, title, message, type: 'error', timestamp: new Date() });
  }, [addNotification]);

  const addSuccess = useCallback((title: string, message: string) => {
    addNotification({ id: `suc-${Date.now()}`, title, message, type: 'achievement', timestamp: new Date() });
  }, [addNotification]);

  const awardPoints = useCallback(async (amount: number, reason: string) => {
    if (!profile || amount === 0) return;
    const newPoints = (profile.points || 0) + amount;
    setProfile(prev => prev ? { ...prev, points: newPoints } : null);
    addSuccess("COGNITIVE_GAIN", `+${amount} XP: ${reason}`);
    try {
      await supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id);
    } catch (err) {}
  }, [profile, addSuccess]);

  useEffect(() => {
    if (!IS_CONFIGURED) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) setDbError(error.message);
      setSession(session);
      setLoading(false);
    }).catch(err => {
      setDbError("NETWORK_FAILURE: Remote gateway unreachable.");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [addError]);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session, impersonatedUserId, activeTab]);

  const fetchUserData = async () => {
    const user = session.user;
    try {
      let { data: profileData, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (pErr) throw pErr;

      if (!profileData) {
        const isSecretAdmin = user.email === SUPER_ADMIN_EMAIL;
        const newProfile = {
          id: user.id,
          name: isSecretAdmin ? ADMIN_NAME : (user.user_metadata?.full_name || 'Anonymous Learner'),
          email: user.email,
          role: isSecretAdmin ? 'super-admin' : 'student',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
          title: isSecretAdmin ? 'Platform Strategist' : 'Pharmacy Student',
          bio: isSecretAdmin ? 'Full Access Core' : 'Synthesizing knowledge.',
          points: isSecretAdmin ? 99999 : 0,
        };
        const { data: inserted, error: iErr } = await supabase.from('profiles').insert(newProfile).select().single();
        if (iErr) throw iErr;
        profileData = inserted;
      }
      setProfile(profileData);

      const fetchId = effectiveUserId;
      const isAdminView = profileData?.role === 'super-admin' && activeTab === 'admin' && !impersonatedUserId;
      
      const [coursesRes, materialsRes, quizzesRes, groupsRes, guidesRes, eventsRes] = await Promise.all([
        isAdminView ? supabase.from('courses').select('*') : supabase.from('courses').select('*').eq('user_id', fetchId),
        isAdminView ? supabase.from('materials').select('*') : supabase.from('materials').select('*').eq('user_id', fetchId),
        isAdminView ? supabase.from('quizzes').select('*') : supabase.from('quizzes').select('*').eq('user_id', fetchId),
        supabase.from('groups').select('*'),
        isAdminView ? supabase.from('study_guides').select('*') : supabase.from('study_guides').select('*').eq('user_id', fetchId),
        isAdminView ? supabase.from('events').select('*') : supabase.from('events').select('*').eq('user_id', fetchId)
      ]);

      setCourses(coursesRes.data || []);
      setMaterials(materialsRes.data || []);
      setQuizzes(quizzesRes.data || []);
      setGroups(groupsRes.data || []);
      setStudyGuides(guidesRes.data || []);
      setTemporalEvents(eventsRes.data || []);

      if (profileData?.role === 'super-admin') {
        const { data: usersRes } = await supabase.from('profiles').select('*').order('points', { ascending: false });
        setAllUsers(usersRes || []);
      }
    } catch (err: any) {
      if (err.message.includes('fetch')) setDbError("DATABASE_UNREACHABLE");
      else addError("SYNC_ERROR", err.message);
    }
  };

  const handleAddCourse = async (course: any) => {
    try {
      const { data, error } = await supabase.from('courses').insert({ ...course, user_id: effectiveUserId, progress: 0, image: `https://picsum.photos/seed/${course.name}/600/400` }).select().single();
      if (error) throw error;
      if (data) {
        setCourses(prev => [...prev, data]);
        addSuccess("CURRICULUM_EXPANDED", `Module ${course.code} initialized.`);
      }
    } catch (err: any) { addError("INITIALIZATION_FAILED", err.message); }
  };

  const handleAddMaterial = async (material: any) => {
    try {
      const { data, error } = await supabase.from('materials').insert({ ...material, user_id: effectiveUserId, date: new Date().toLocaleDateString(), bookmarked: false }).select().single();
      if (error) throw error;
      if (data) {
        setMaterials(prev => [...prev, data]);
        addSuccess("PACKET_SECURED", "Node indexed in vault.");
      }
    } catch (err: any) { addError("UPLOAD_FAILED", err.message); }
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent animate-spin rounded-full mb-6"></div>
      <p className="text-cyan-500 font-bold uppercase tracking-[0.5em] text-[10px]">Establishing Link...</p>
    </div>
  );

  if (!IS_CONFIGURED || dbError === "DATABASE_UNREACHABLE") return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
       <div className="w-24 h-24 bg-pink-500/10 rounded-full border border-pink-500/20 flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(236,72,153,0.1)]">
          <svg className="w-12 h-12 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
       </div>
       <h1 className="text-4xl font-bold font-space text-white uppercase tracking-tighter mb-4">Neural Link Required</h1>
       <p className="text-slate-500 text-xs uppercase tracking-[0.3em] mb-12 max-w-md mx-auto leading-relaxed">
         Automated environment injection failed. Please manually provide your Supabase credentials to establish a secure database connection.
       </p>
       
       <div className="w-full max-w-md space-y-4">
          <div className="glass p-8 rounded-[40px] border border-white/10 bg-slate-900/40 space-y-6">
             <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2 block text-left">Supabase Project URL</label>
                <input 
                  type="text" 
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs focus:border-cyan-500 outline-none transition-all"
                />
             </div>
             <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2 block text-left">Anon Key (Public)</label>
                <input 
                  type="password" 
                  value={manualKey}
                  onChange={e => setManualKey(e.target.value)}
                  placeholder="Paste your anon public key..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs focus:border-cyan-500 outline-none transition-all"
                />
             </div>
             <button 
               onClick={() => configureSupabaseManual(manualUrl, manualKey)}
               disabled={!manualUrl.includes('supabase.co') || manualKey.length < 20}
               className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-3xl font-bold text-[10px] uppercase tracking-[0.4em] shadow-2xl shadow-cyan-600/20 disabled:opacity-30 transition-all active:scale-95"
             >
               Finalize Manual Link
             </button>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[9px] text-slate-600 uppercase font-bold tracking-widest hover:text-white transition-colors">Clear Local Overrides</button>
       </div>
    </div>
  );

  if (!session) return <Auth />;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} points={profile?.points || 0} isSuperAdmin={isSuperAdmin} />
      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative custom-scrollbar">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
          <div>
            <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.4em] mb-2">SECTOR: {activeTab.toUpperCase()}</p>
            <h1 className="text-5xl font-bold font-space text-white tracking-tighter">Neural Hub</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="glass px-6 py-3 rounded-2xl border border-white/5 flex flex-col items-end">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Cognitive XP</span>
              <span className="text-xl font-bold text-cyan-400 font-space tracking-tight">{(profile?.points || 0).toLocaleString()}</span>
            </div>
            <button onClick={() => setShowProfile(true)} className="relative group">
              <img src={profile?.avatar} className="w-14 h-14 rounded-2xl border border-white/10 relative z-10 transition-transform group-hover:scale-110" alt="" />
            </button>
          </div>
        </header>

        <div className="fixed top-6 right-6 z-[200] space-y-4 pointer-events-none">
          {notifications.map(notif => (
            <div key={notif.id} className={`pointer-events-auto w-80 glass border-l-4 ${notif.type === 'error' ? 'border-pink-500' : 'border-cyan-400'} p-4 rounded-xl shadow-2xl animate-in slide-in-from-right-10 duration-500`}>
              <h4 className={`text-xs font-bold uppercase tracking-widest ${notif.type === 'error' ? 'text-pink-400' : 'text-cyan-400'}`}>{notif.title}</h4>
              <p className="text-[10px] text-slate-400 mt-1 uppercase">{notif.message}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <Suspense fallback={<ViewLoader />}>
            {activeTab === 'dashboard' && <Dashboard courses={courses} quizzes={quizzes} materials={materials} setActiveTab={setActiveTab} setActiveQuizId={setActiveQuizId} points={profile?.points || 0} />}
            {activeTab === 'materials' && <CourseManager courses={courses} materials={materials} onAddCourse={handleAddCourse} onAddMaterial={handleAddMaterial} setMaterials={setMaterials} setQuizzes={setQuizzes} awardPoints={awardPoints} quizSettings={quizSettings} />}
            {activeTab === 'nexus' && <NexusChat courses={courses} materials={materials} userId={effectiveUserId!} onAwardPoints={awardPoints} />}
            {activeTab === 'guides' && <StudyGuidesView materials={materials} courses={courses} studyGuides={studyGuides} setStudyGuides={setStudyGuides} awardPoints={awardPoints} userId={effectiveUserId!} setQuizzes={setQuizzes} setActiveTab={setActiveTab} quizSettings={quizSettings} setMaterials={setMaterials} />}
            {activeTab === 'quizzes' && <QuizModule quizzes={quizzes} setQuizzes={setQuizzes} activeQuizId={activeQuizId} setActiveQuizId={setActiveQuizId} materials={materials} courses={courses} awardPoints={awardPoints} quizSettings={quizSettings} userId={effectiveUserId!} />}
            {activeTab === 'bookmarks' && <BookmarksView materials={materials} courses={courses} setMaterials={setMaterials} awardPoints={awardPoints} profileName={profile?.name} profileTitle={profile?.title} />}
            {activeTab === 'groups' && <GroupHub groups={groups} availableQuizzes={quizzes} onAwardPoints={awardPoints} currentUserId={effectiveUserId!} currentUserName={profile?.name || 'User'} isAdmin={isSuperAdmin} />}
            {activeTab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} quizSettings={quizSettings} setQuizSettings={setQuizSettings} awardPoints={awardPoints} materials={materials} quizzes={quizzes} temporalEvents={temporalEvents} setTemporalEvents={setTemporalEvents} user_id={effectiveUserId!} />}
            {activeTab === 'curriculum' && <CurriculumView materials={materials} courses={courses} setActiveTab={setActiveTab} setMaterials={setMaterials} awardPoints={awardPoints} />}
            {activeTab === 'admin' && isSuperAdmin && (
              <AdminPortal allUsers={allUsers} allCourses={courses} allMaterials={materials} allQuizzes={quizzes} onImpersonate={setImpersonatedUserId} onUpdateUser={() => {}} onBroadcast={() => {}} awardPoints={awardPoints} />
            )}
          </Suspense>
        </div>
        {showProfile && profile && <ProfileModal profile={profile} setProfile={setProfile} onClose={() => setShowProfile(false)} awardPoints={awardPoints} />}
      </main>
    </div>
  );
};

export default App;
