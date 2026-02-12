
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { supabase, IS_CONFIGURED } from './supabaseClient';
import { Course, Material, Quiz, Message, StudyGroup, AppNotification, UserProfile, NotificationSettings, QuizSettings, StudyGuide, TemporalEvent } from './types';
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
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-pulse" role="status" aria-label="Loading view">
    <div className="w-16 h-16 border-b-2 border-cyan-500 rounded-full animate-spin mb-4"></div>
    <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.4em]">Synchronizing_View_Data...</p>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'materials' | 'nexus' | 'guides' | 'quizzes' | 'groups' | 'bookmarks' | 'settings' | 'curriculum' | 'admin'>('dashboard');
  
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
    } catch (err) {
      console.error("[App] Points sync failure:", err);
    }
  }, [profile, addSuccess]);

  useEffect(() => {
    if (!IS_CONFIGURED) {
      setDbError("CONFIGURATION_MISSING: The application cannot find SUPABASE_URL or SUPABASE_ANON_KEY. Please verify Netlify environment variables and redeploy.");
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        if (error.message.includes('fetch')) {
          setDbError("DATABASE_UNREACHABLE: Network request failed. This usually means the SUPABASE_URL is invalid or the database is paused.");
        } else {
          addError("Auth Sync", error.message);
        }
      }
      setSession(session);
      setLoading(false);
    }).catch(err => {
      setDbError("NETWORK_FAILURE: Connection to Supabase failed. Ensure your environment variables are correctly formatted.");
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

      if (coursesRes.error || materialsRes.error || quizzesRes.error) {
        const err = coursesRes.error || materialsRes.error || quizzesRes.error;
        if (err?.message.includes('academic_year') || err?.message.includes('column') || err?.message.includes('relation')) {
          setDbError(`SCHEMA_MISMATCH: ${err.message}. Please run the MASTER SQL script in Supabase.`);
        }
      }

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
      if (err.message.includes('fetch')) {
        setDbError("DATABASE_UNREACHABLE: Network connection refused by gateway.");
      } else {
        addError("SYNC_ERROR", err.message);
      }
    }
  };

  const handleAddCourse = async (course: any) => {
    try {
      const { data, error } = await supabase.from('courses').insert({ 
        ...course, 
        user_id: effectiveUserId, 
        progress: 0, 
        image: `https://picsum.photos/seed/${course.name}/600/400` 
      }).select().single();
      
      if (error) throw error;
      if (data) {
        setCourses(prev => [...prev, data]);
        addSuccess("CURRICULUM_EXPANDED", `Module ${course.code} initialized.`);
      }
    } catch (err: any) {
      addError("INITIALIZATION_FAILED", err.message || "Verify SQL setup and column names.");
    }
  };

  const handleAddMaterial = async (material: any) => {
    try {
      const { data, error } = await supabase.from('materials').insert({ 
        ...material, 
        user_id: effectiveUserId, 
        date: new Date().toLocaleDateString(), 
        bookmarked: false 
      }).select().single();
      if (error) throw error;
      if (data) {
        setMaterials(prev => [...prev, data]);
        addSuccess("PACKET_SECURED", "Node indexed in vault.");
      }
    } catch (err: any) {
      addError("UPLOAD_FAILED", err.message);
    }
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent animate-spin rounded-full mb-6"></div>
      <p className="text-cyan-500 font-bold uppercase tracking-[0.5em] text-[10px]">Establishing Link...</p>
    </div>
  );

  if (dbError) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
       <div className="w-20 h-20 bg-pink-500/10 rounded-3xl border border-pink-500/30 flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
       </div>
       <h1 className="text-3xl font-bold font-space text-white uppercase tracking-tighter mb-4">Neural Gateway Offline</h1>
       <div className="max-w-2xl p-6 glass border border-pink-500/20 bg-pink-500/5 rounded-2xl mb-8">
          <p className="text-pink-400 font-bold uppercase tracking-widest text-xs break-words whitespace-pre-wrap">{dbError}</p>
       </div>
       <div className="flex flex-col md:flex-row gap-4">
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-white/10 transition-all">Retry Synchronization</button>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-slate-900 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-cyan-600/20 transition-all text-center">Check Supabase Console</a>
       </div>
    </div>
  );

  if (!session) return <Auth />;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} points={profile?.points || 0} isSuperAdmin={isSuperAdmin} />
      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative custom-scrollbar">
        {impersonatedUserId && (
          <div className="fixed top-0 inset-x-0 bg-red-600 text-white p-2 text-center text-[10px] font-bold uppercase tracking-widest z-[300] flex justify-center items-center gap-4 shadow-2xl">
             <span>Diagnostic Mode: Impersonating [{allUsers.find(u => u.id === impersonatedUserId)?.name}]</span>
             <button onClick={() => setImpersonatedUserId(null)} className="px-4 py-1 bg-black/40 rounded-full font-black">ABORT</button>
          </div>
        )}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
          <div className={`${impersonatedUserId ? 'mt-8' : ''}`}>
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
