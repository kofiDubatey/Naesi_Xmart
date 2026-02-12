import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { supabase, IS_CONFIGURED, clearSupabaseConfig } from './supabaseClient';
import { Course, Material, Quiz, StudyGroup, AppNotification, UserProfile, NotificationSettings, QuizSettings, StudyGuide, TemporalEvent } from './types';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ProfileModal from './components/ProfileModal';
import { ICONS } from './constants';

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
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (err: any) {
        if (IS_CONFIGURED) {
          console.error("Auth sync failed", err);
          setDbError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session, impersonatedUserId, activeTab]);

  const fetchUserData = async () => {
    if (!session?.user) return;
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
          points: 0
        };
        const { data: created, error: cErr } = await supabase.from('profiles').insert(newProfile).select().single();
        if (cErr) throw cErr;
        profileData = created;
      }
      setProfile(profileData);

      const [coursesRes, materialsRes, quizzesRes, guidesRes, eventsRes, groupsRes, allUsersRes] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', effectiveUserId),
        supabase.from('materials').select('*').eq('user_id', effectiveUserId),
        supabase.from('quizzes').select('*').eq('user_id', effectiveUserId),
        supabase.from('study_guides').select('*').eq('user_id', effectiveUserId),
        supabase.from('events').select('*').eq('user_id', effectiveUserId),
        supabase.from('groups').select('*'),
        isSuperAdmin ? supabase.from('profiles').select('*') : Promise.resolve({ data: [] })
      ]);

      if (coursesRes.data) setCourses(coursesRes.data);
      if (materialsRes.data) setMaterials(materialsRes.data);
      if (quizzesRes.data) setQuizzes(quizzesRes.data);
      if (guidesRes.data) setStudyGuides(guidesRes.data);
      if (eventsRes.data) setTemporalEvents(eventsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data);
      if (allUsersRes.data) setAllUsers(allUsersRes.data);

    } catch (err: any) {
      console.error("Fetch failure", err);
    }
  };

  const handleAddCourse = async (course: any) => {
    try {
      const { data, error } = await supabase.from('courses').insert({ ...course, user_id: effectiveUserId }).select().single();
      if (error) throw error;
      setCourses(prev => [data, ...prev]);
      addSuccess("MODULE_INITIALIZED", "New curriculum node manifesting.");
    } catch (err: any) {
      addError("LINK_FAILURE", err.message);
    }
  };

  const handleAddMaterial = async (material: any) => {
    try {
      const { data, error } = await supabase.from('materials').insert({ ...material, user_id: effectiveUserId }).select().single();
      if (error) throw error;
      setMaterials(prev => [data, ...prev]);
      addSuccess("PACKET_INTEGRATED", "Knowledge packet stored in vault.");
    } catch (err: any) {
      addError("SYNC_FAILURE", err.message);
    }
  };

  const onUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) throw error;
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      addSuccess("IDENTITY_RECONFIGURED", "User profile updated successfully.");
    } catch (err: any) {
      addError("CORE_ERROR", err.message);
    }
  };

  const onBroadcast = (title: string, message: string) => {
    addNotification({
      id: `broadcast-${Date.now()}`,
      title: `SYSTEM_BROADCAST: ${title}`,
      message,
      type: 'system',
      timestamp: new Date()
    });
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><ViewLoader /></div>;
  
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans selection:bg-cyan-500/30">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        points={profile?.points || 0} 
        isSuperAdmin={isSuperAdmin}
      />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar h-screen">
        <header className="p-8 flex justify-between items-center border-b border-white/5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-40">
          <div>
            <h2 className="text-sm font-bold font-space uppercase tracking-[0.4em] text-cyan-400">Naesi_Terminal_v4</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Status: SYNCHRONIZED</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-xs font-bold text-white uppercase tracking-tight">{profile?.name || 'Anonymous'}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{profile?.title || 'Student'}</p>
            </div>
            <button 
              onClick={() => setShowProfile(true)}
              className="w-12 h-12 rounded-2xl border-2 border-white/10 hover:border-cyan-400 transition-all p-0.5 group overflow-hidden"
            >
              <img src={profile?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=nx'} className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform" alt="Profile" />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {dbError && (
            <div className="mb-8 p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex justify-between items-center">
               <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">CRITICAL_SYNC_FAIL: {dbError}</p>
               <button onClick={clearSupabaseConfig} className="text-[9px] text-white bg-pink-600 px-4 py-1.5 rounded-lg font-bold uppercase">Reset Config</button>
            </div>
          )}

          <Suspense fallback={<ViewLoader />}>
            {activeTab === 'dashboard' && (
              <Dashboard 
                courses={courses} 
                quizzes={quizzes} 
                materials={materials} 
                setActiveTab={setActiveTab} 
                setActiveQuizId={setActiveQuizId} 
                points={profile?.points || 0}
              />
            )}
            {activeTab === 'materials' && (
              <CourseManager 
                courses={courses} 
                materials={materials} 
                onAddCourse={handleAddCourse} 
                onAddMaterial={handleAddMaterial}
                setMaterials={setMaterials}
                setQuizzes={setQuizzes}
                awardPoints={awardPoints}
                quizSettings={quizSettings}
              />
            )}
            {activeTab === 'quizzes' && (
              <QuizModule 
                quizzes={quizzes} 
                setQuizzes={setQuizzes} 
                activeQuizId={activeQuizId} 
                setActiveQuizId={setActiveQuizId} 
                materials={materials} 
                courses={courses} 
                awardPoints={awardPoints} 
                quizSettings={quizSettings}
                userId={effectiveUserId}
              />
            )}
            {activeTab === 'groups' && (
              <GroupHub 
                groups={groups} 
                availableQuizzes={quizzes} 
                onAwardPoints={awardPoints} 
                currentUserId={effectiveUserId} 
                currentUserName={profile?.name || 'Anonymous'}
                isAdmin={profile?.role === 'admin' || profile?.role === 'super-admin'}
              />
            )}
            {activeTab === 'bookmarks' && (
              <BookmarksView 
                materials={materials} 
                courses={courses} 
                setMaterials={setMaterials} 
                awardPoints={awardPoints}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                settings={settings} 
                setSettings={setSettings} 
                quizSettings={quizSettings} 
                setQuizSettings={setQuizSettings} 
                awardPoints={awardPoints} 
                materials={materials} 
                quizzes={quizzes} 
                temporalEvents={temporalEvents}
                setTemporalEvents={setTemporalEvents}
                user_id={effectiveUserId}
              />
            )}
            {activeTab === 'guides' && (
              <StudyGuidesView 
                materials={materials} 
                courses={courses} 
                studyGuides={studyGuides} 
                setStudyGuides={setStudyGuides} 
                awardPoints={awardPoints} 
                userId={effectiveUserId} 
                setQuizzes={setQuizzes}
                setActiveTab={setActiveTab}
                quizSettings={quizSettings}
                setMaterials={setMaterials}
              />
            )}
            {activeTab === 'nexus' && (
              <NexusChat 
                courses={courses} 
                materials={materials} 
                userId={effectiveUserId} 
                onAwardPoints={awardPoints}
              />
            )}
            {activeTab === 'curriculum' && (
              <CurriculumView 
                materials={materials} 
                courses={courses} 
                setActiveTab={setActiveTab}
                setMaterials={setMaterials}
                awardPoints={awardPoints}
              />
            )}
            {activeTab === 'admin' && isSuperAdmin && (
              <AdminPortal 
                allUsers={allUsers} 
                allCourses={courses} 
                allMaterials={materials} 
                allQuizzes={quizzes} 
                onImpersonate={setImpersonatedUserId}
                onUpdateUser={onUpdateUser}
                onBroadcast={onBroadcast}
                awardPoints={awardPoints}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* Notification HUD */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 w-80 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`pointer-events-auto p-4 rounded-2xl border flex gap-4 animate-in slide-in-from-right-8 duration-500 shadow-2xl backdrop-blur-xl ${
            n.type === 'error' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' : 
            n.type === 'achievement' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
            'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
          }`}>
             <div className="pt-1">
               {n.type === 'error' ? <ICONS.Settings className="w-5 h-5" /> : <ICONS.Bell className="w-5 h-5" />}
             </div>
             <div>
               <p className="text-[10px] font-bold uppercase tracking-widest mb-1">{n.title}</p>
               <p className="text-xs leading-relaxed font-medium">{n.message}</p>
             </div>
          </div>
        ))}
      </div>

      {showProfile && profile && (
        <ProfileModal 
          profile={profile} 
          setProfile={setProfile} 
          onClose={() => setShowProfile(false)} 
          awardPoints={awardPoints}
        />
      )}
    </div>
  );
};

export default App;
