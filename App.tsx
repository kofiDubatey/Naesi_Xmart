
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
          name: user.user_metadata?.full_name || ADMIN_NAME,
          email: user.email,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
          title: 'Student Pharmacist',
          bio: 'Synthesizing knowledge...',
          role: isSecretAdmin ? 'super-admin' : 'student',
          points: 0,
          quiz_settings: { defaultQuestionCount: 5, preferredDifficulty: 'standard' },
          notification_settings: { deadlines: true, reminders: true, achievements: true, system: true, dailyDigest: false, digestTime: '08:00', quietMode: false }
        };
        const { error: insError } = await supabase.from('profiles').insert(newProfile);
        if (insError) throw insError;
        setProfile(newProfile as UserProfile);
      } else {
        setProfile(profileData as UserProfile);
        if (profileData.notification_settings) setSettings(profileData.notification_settings);
        if (profileData.quiz_settings) setQuizSettings(profileData.quiz_settings);
      }

      // Fetch academic data
      const { data: cData } = await supabase.from('courses').select('*').eq('user_id', effectiveUserId);
      if (cData) setCourses(cData);

      const { data: mData } = await supabase.from('materials').select('*').eq('user_id', effectiveUserId);
      if (mData) setMaterials(mData);

      const { data: qData } = await supabase.from('quizzes').select('*').eq('user_id', effectiveUserId).order('created_at', { ascending: false });
      if (qData) setQuizzes(qData);

      const { data: sgData } = await supabase.from('study_guides').select('*').eq('user_id', effectiveUserId);
      if (sgData) setStudyGuides(sgData);

      const { data: eData } = await supabase.from('events').select('*').eq('user_id', effectiveUserId);
      if (eData) setTemporalEvents(eData);

      const { data: gData } = await supabase.from('groups').select('*');
      if (gData) setGroups(gData);

      if (profileData?.role === 'super-admin') {
        const { data: uData } = await supabase.from('profiles').select('*');
        if (uData) setAllUsers(uData);
      }

    } catch (err: any) {
      addError("DATA_SYNC_FAILURE", err.message);
    }
  };

  if (loading) return <ViewLoader />;
  if (!session) return <Auth />;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        points={profile?.points || 0} 
        isSuperAdmin={isSuperAdmin} 
      />
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          <Suspense fallback={<ViewLoader />}>
            {activeTab === 'dashboard' && <Dashboard courses={courses} quizzes={quizzes} materials={materials} setActiveTab={setActiveTab} setActiveQuizId={setActiveQuizId} points={profile?.points || 0} />}
            {activeTab === 'materials' && <CourseManager courses={courses} materials={materials} onAddCourse={(c:any)=>setCourses([...courses, c])} onAddMaterial={(m:any)=>setMaterials([...materials, m])} setMaterials={setMaterials} setQuizzes={setQuizzes} awardPoints={awardPoints} quizSettings={quizSettings} />}
            {activeTab === 'nexus' && <NexusChat courses={courses} materials={materials} userId={effectiveUserId} onAwardPoints={awardPoints} />}
            {activeTab === 'guides' && <StudyGuidesView materials={materials} courses={courses} studyGuides={studyGuides} setStudyGuides={setStudyGuides} awardPoints={awardPoints} userId={effectiveUserId} setQuizzes={setQuizzes} setActiveTab={setActiveTab} quizSettings={quizSettings} setMaterials={setMaterials} />}
            {activeTab === 'quizzes' && <QuizModule quizzes={quizzes} setQuizzes={setQuizzes} activeQuizId={activeQuizId} setActiveQuizId={setActiveQuizId} materials={materials} courses={courses} awardPoints={awardPoints} quizSettings={quizSettings} userId={effectiveUserId} />}
            {activeTab === 'groups' && <GroupHub groups={groups} availableQuizzes={quizzes} onAwardPoints={awardPoints} currentUserId={effectiveUserId} currentUserName={profile?.name || ''} isAdmin={profile?.role === 'admin'} />}
            {activeTab === 'bookmarks' && <BookmarksView materials={materials} courses={courses} setMaterials={setMaterials} awardPoints={awardPoints} />}
            {activeTab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} quizSettings={quizSettings} setQuizSettings={setQuizSettings} awardPoints={awardPoints} materials={materials} quizzes={quizzes} temporalEvents={temporalEvents} setTemporalEvents={setTemporalEvents} user_id={effectiveUserId} />}
            {activeTab === 'curriculum' && <CurriculumView materials={materials} courses={courses} setActiveTab={setActiveTab} setMaterials={setMaterials} awardPoints={awardPoints} />}
            {activeTab === 'admin' && isSuperAdmin && <AdminPortal allUsers={allUsers} allCourses={courses} allMaterials={materials} allQuizzes={quizzes} onImpersonate={setImpersonatedUserId} onUpdateUser={(id, up) => setAllUsers(allUsers.map(u => u.id === id ? {...u, ...up} : u))} onBroadcast={(t, m) => addNotification({id:Date.now().toString(), title:t, message:m, type:'system', timestamp:new Date()})} awardPoints={awardPoints} />}
          </Suspense>
        </div>
      </main>

      {showProfile && profile && (
        <ProfileModal 
          profile={profile} 
          setProfile={setProfile} 
          onClose={() => setShowProfile(false)} 
          awardPoints={awardPoints} 
        />
      )}
      
      <button 
        onClick={() => setShowProfile(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 p-0.5 shadow-2xl shadow-cyan-500/20 group hover:scale-110 active:scale-95 transition-all z-50"
      >
        <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900">
           <img src={profile?.avatar} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Profile" />
        </div>
      </button>

      <div className="fixed top-8 right-8 z-[100] space-y-4 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="w-80 glass p-4 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${n.type === 'error' ? 'bg-pink-500/20 text-pink-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                   {n.type === 'error' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                </div>
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-white">{n.title}</p>
                   <p className="text-[9px] text-slate-400 mt-0.5">{n.message}</p>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
