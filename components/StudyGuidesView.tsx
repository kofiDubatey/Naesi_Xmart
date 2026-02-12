
import React, { useState, useMemo } from 'react';
import { Material, StudyGuide, Course, Quiz, QuizQuestion, QuizSettings } from '../types';
import { generateStudyGuide, generateQuizFromGuide } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import { ICONS } from '../constants';

interface StudyGuidesViewProps {
  materials: Material[];
  courses: Course[];
  studyGuides: StudyGuide[];
  setStudyGuides: React.Dispatch<React.SetStateAction<StudyGuide[]>>;
  awardPoints: (amount: number, reason: string) => void;
  userId: string;
  setQuizzes: React.Dispatch<React.SetStateAction<Quiz[]>>;
  setActiveTab: (tab: any) => void;
  quizSettings: QuizSettings;
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
}

const StudyGuidesView: React.FC<StudyGuidesViewProps> = ({ 
  materials, 
  courses, 
  studyGuides, 
  setStudyGuides, 
  awardPoints, 
  userId, 
  setQuizzes,
  setActiveTab,
  quizSettings,
  setMaterials
}) => {
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [isSynthesizingFull, setIsSynthesizingFull] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showReminderModal, setShowReminderModal] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState("12:00");

  const [drillMode, setDrillMode] = useState(false);
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [drillAnswers, setDrillAnswers] = useState<number[]>([]);
  const [showDrillFeedback, setShowDrillFeedback] = useState(false);

  const activeGuide = useMemo(() => studyGuides.find(g => g.id === activeGuideId), [studyGuides, activeGuideId]);

  const sourceMaterial = useMemo(() => 
    activeGuide ? materials.find(m => m.id === activeGuide.material_id) : null
  , [activeGuide, materials]);

  const sourceCourse = useMemo(() => 
    sourceMaterial ? courses.find(c => c.id === sourceMaterial.course_id) : null
  , [sourceMaterial, courses]);

  const relatedMaterials = useMemo(() => {
    if (!sourceMaterial) return [];
    return materials.filter(m => m.course_id === sourceMaterial.course_id && m.id !== sourceMaterial.id);
  }, [sourceMaterial, materials]);

  const handleGenerateGuide = async (material: Material) => {
    setGeneratingForId(material.id);
    try {
      const guideData = await generateStudyGuide(material.content, material.title);
      
      const { data, error } = await supabase.from('study_guides').insert({
        user_id: userId,
        material_id: material.id,
        title: `Protocol: ${material.title}`,
        learning_path: guideData.learning_path,
        concept_breakdown: guideData.concept_breakdown,
        practice_questions: guideData.practice_questions,
        clinical_scenarios: guideData.clinical_scenarios
      }).select().single();

      if (error) throw error;
      
      setStudyGuides(prev => [data, ...prev]);
      setActiveGuideId(data.id);
      awardPoints(150, "Advanced Study Protocol Synthesized");
    } catch (err) {
      console.error("Study guide generation failed", err);
    } finally {
      setGeneratingForId(null);
    }
  };

  const setManualReminder = async (matId: string) => {
    const scheduledString = `${reminderDate}T${reminderTime}`;
    try {
      const { error } = await supabase.from('materials').update({ 
        reminder_time: scheduledString,
        bookmarked: true 
      }).eq('id', matId);
      
      if (error) throw error;
      
      setMaterials(prev => prev.map(m => m.id === matId ? { ...m, reminder_time: scheduledString, bookmarked: true } : m));
      setShowReminderModal(null);
      awardPoints(15, "Temporal Sync Established via Protocol");
    } catch (err) {
      console.error("Failed to sync temporal reminder", err);
    }
  };

  const handleCreateQuizFromGuide = async (useExistingQuestions = true) => {
    if (!activeGuide || !sourceMaterial) return;
    
    let questions: QuizQuestion[] = activeGuide.practice_questions;
    let quizTitle = `Protocol Check: ${activeGuide.title.replace('Protocol: ', '')}`;

    if (!useExistingQuestions) {
      setIsSynthesizingFull(true);
      try {
        questions = await generateQuizFromGuide(activeGuide, quizSettings.defaultQuestionCount);
        quizTitle = `Extended Assessment: ${activeGuide.title.replace('Protocol: ', '')}`;
      } catch (err) {
        console.error("AI quiz synthesis failed", err);
        setIsSynthesizingFull(false);
        return;
      }
    } else {
      setIsCreatingQuiz(true);
    }

    try {
      const { data, error } = await supabase.from('quizzes').insert({
        user_id: userId,
        course_id: sourceMaterial.course_id,
        material_id: sourceMaterial.id,
        title: quizTitle,
        questions: questions,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        completed: false
      }).select().single();

      if (error) throw error;
      
      setQuizzes(prev => [data, ...prev]);
      awardPoints(useExistingQuestions ? 50 : 150, useExistingQuestions ? "Assessment Generated from Protocol" : "Full Assessment Synthesized from Protocol");
      setActiveTab('quizzes');
    } catch (err) {
      console.error("Failed to manifest quiz from guide", err);
    } finally {
      setIsCreatingQuiz(false);
      setIsSynthesizingFull(false);
    }
  };

  const startDrill = () => {
    if (!activeGuide) return;
    setDrillAnswers(new Array(activeGuide.practice_questions.length).fill(-1));
    setCurrentDrillIndex(0);
    setShowDrillFeedback(false);
    setDrillMode(true);
  };

  const handleDrillAnswer = (idx: number) => {
    const newAnswers = [...drillAnswers];
    newAnswers[currentDrillIndex] = idx;
    setDrillAnswers(newAnswers);
    setShowDrillFeedback(true);
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const alreadyHasGuide = studyGuides.some(g => g.material_id === m.id);
      if (alreadyHasGuide) return false;
      if (!searchTerm) return true;
      return m.title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [materials, studyGuides, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {!activeGuide ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-2xl font-bold font-space text-white uppercase tracking-tighter">Neural Study Archives</h3>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Multi-Layered Knowledge Synthesis</p>
            </div>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-2xl px-12 py-3 text-xs text-white focus:border-indigo-500 outline-none w-64 focus-visible:ring-1 focus-visible:ring-indigo-400"
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-6">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-4">Synthesized Protocols ({studyGuides.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {studyGuides.length === 0 && (
                  <div className="col-span-full glass p-16 rounded-[40px] border border-dashed border-white/10 text-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No Study Protocols Initialized</p>
                  </div>
                )}
                {studyGuides.map(guide => (
                  <div key={guide.id} className="glass p-8 rounded-[40px] border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all group relative overflow-hidden">
                    <div className="hud-corner hud-tl border-indigo-400/50"></div>
                    <h5 className="font-bold text-white text-lg mb-4 font-space uppercase tracking-tight">{guide.title}</h5>
                    <button 
                      onClick={() => setActiveGuideId(guide.id)}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-indigo-400 border border-indigo-500/30 rounded-2xl uppercase tracking-[0.2em] transition-all"
                    >
                      Initialize Link
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.3em] mb-4">Pending Synthesis</h4>
              <div className="space-y-4">
                {filteredMaterials.map(mat => (
                  <div key={mat.id} className="glass p-6 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all flex justify-between items-center group">
                    <div>
                      <p className="text-white font-bold text-sm uppercase tracking-tight">{mat.title}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Sync Date: {mat.date}</p>
                    </div>
                    <button 
                      onClick={() => handleGenerateGuide(mat)}
                      disabled={generatingForId === mat.id}
                      className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                    >
                      {generatingForId === mat.id ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent animate-spin rounded-full"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-12">
          {/* Header */}
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-white/10 pb-10 gap-6">
            <div>
              <button 
                onClick={() => { setActiveGuideId(null); setDrillMode(false); }}
                className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2 hover:text-white transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Archive Hub
              </button>
              <h2 className="text-5xl font-bold font-space text-white uppercase tracking-tighter leading-none">{activeGuide.title}</h2>
              <div className="flex items-center gap-4 mt-4">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.4em]">Protocol: Advanced_Knowledge_Manifest</p>
                {sourceCourse && (
                   <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                     Module: {sourceCourse.code}
                   </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => handleCreateQuizFromGuide(true)}
                disabled={isCreatingQuiz}
                className="px-8 py-4 bg-cyan-600/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold rounded-2xl uppercase tracking-widest hover:bg-cyan-600/20 transition-all flex items-center gap-3"
              >
                {isCreatingQuiz ? (
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent animate-spin rounded-full"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                )}
                Manifest Quiz from Nodes
              </button>
              <button onClick={() => window.print()} className="px-8 py-4 glass text-[10px] font-bold text-slate-300 rounded-2xl uppercase tracking-widest border-white/10 hover:border-white/20">Print Hardcopy</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1 space-y-8">
              <section className="glass p-8 rounded-[40px] border border-cyan-500/20 relative">
                <div className="hud-corner hud-tl border-cyan-400"></div>
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.3em] mb-8 border-l-2 border-cyan-500 pl-4">Cognitive Path</h4>
                <div className="space-y-6">
                  {activeGuide.learning_path.map((step, i) => (
                    <div key={i} className="flex gap-6 group">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold font-space text-white group-hover:border-cyan-400 transition-colors">0{i+1}</div>
                        {i < activeGuide.learning_path.length - 1 && <div className="w-px flex-1 bg-white/5 my-2"></div>}
                      </div>
                      <div className="pt-2">
                        <p className="text-sm text-slate-300 font-medium leading-relaxed group-hover:text-white transition-colors">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass p-8 rounded-[40px] border border-white/5 bg-white/5 relative overflow-hidden">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 border-l-2 border-slate-500 pl-4">Knowledge Lineage</h4>
                <div className="space-y-8">
                  <div>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">Primary Source Manifest</p>
                    {sourceMaterial ? (
                      <button 
                        onClick={() => setActiveTab('materials')}
                        className="w-full text-left p-5 rounded-2xl bg-slate-900/50 border border-cyan-500/20 hover:border-cyan-500/50 transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:bg-cyan-500 group-hover:text-slate-900 transition-colors">
                            <ICONS.Materials className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight truncate">{sourceMaterial.title}</p>
                        </div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest ml-11">Sync ID: {sourceMaterial.id.slice(0, 8)}</p>
                      </button>
                    ) : (
                      <p className="text-[10px] text-slate-500 uppercase">Link Severed</p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-2 space-y-12">
              <section>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-8 border-l-2 border-white/20 pl-4">Atomic Concepts Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeGuide.concept_breakdown.map((c, i) => (
                    <div key={i} className="glass p-6 rounded-3xl border border-white/5 hover:border-indigo-500/40 transition-all">
                      <h5 className="text-indigo-400 font-bold uppercase text-xs mb-3 tracking-widest">{c.term}</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{c.explanation}</p>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-1">Clinical Significance</p>
                        <p className="text-[10px] text-slate-300 italic">{c.significance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyGuidesView;
