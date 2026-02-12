
import React, { useState, useEffect, useRef } from 'react';
import { Quiz, QuizQuestion, Material, Course, QuizSettings } from '../types';
import { getFeedback, generateProfessionalPharmacyQuiz, analyzeClinicalPath } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import { ICONS } from '../constants';
import FormattedText from './FormattedText';

interface QuizModuleProps {
  quizzes: Quiz[];
  setQuizzes: React.Dispatch<React.SetStateAction<Quiz[]>>;
  activeQuizId: string | null;
  setActiveQuizId: (id: string | null) => void;
  materials: Material[];
  courses: Course[];
  awardPoints: (amount: number, reason: string) => void;
  quizSettings: QuizSettings;
  userId?: string;
}

const QuizModule: React.FC<QuizModuleProps> = ({ quizzes, setQuizzes, activeQuizId, setActiveQuizId, materials, courses, awardPoints, quizSettings, userId }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'history' | 'setup'>('active');
  
  // Analysis State
  const [analyzingQuizId, setAnalyzingQuizId] = useState<string | null>(null);
  const [clinicalAnalysis, setClinicalAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Setup Wizard State
  const [setupCourseId, setSetupCourseId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [sessionFileContent, setSessionFileContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeQuiz = quizzes.find(q => q.id === activeQuizId) || null;

  useEffect(() => {
    if (activeQuiz) {
      setCurrentQuestionIndex(activeQuiz.current_index || 0);
      setAnswers(activeQuiz.user_answers || new Array(activeQuiz.questions.length).fill(-1));
      setShowResult(activeQuiz.completed);
      setAiFeedback("");
      if (activeQuiz.completed) setViewMode('active');
    }
  }, [activeQuizId]);

  const saveProgress = async (updates: Partial<Quiz>) => {
    if (!activeQuizId) return;
    setQuizzes(prev => prev.map(q => q.id === activeQuizId ? { ...q, ...updates } : q));
    await supabase.from('quizzes').update(updates).eq('id', activeQuizId);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSessionFile(file);
      try {
         if (file.type === 'text/plain') {
            const text = await file.text();
            setSessionFileContent(text);
         } else {
            setSessionFileContent(`[SESSION_DOC: ${file.name} (Binary)]`);
         }
      } catch (err) {
         console.error("Session file error", err);
      }
    }
  };

  const handleNext = async () => {
    if (!activeQuiz) return;
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      saveProgress({ current_index: nextIdx });
    } else {
      let scoreCount = 0;
      activeQuiz.questions.forEach((q, idx) => {
        if (q.correctAnswer === answers[idx]) scoreCount++;
      });
      const percentage = (scoreCount / activeQuiz.questions.length) * 100;
      setShowResult(true);
      setLoadingFeedback(true);
      await saveProgress({ completed: true, score: percentage, user_answers: answers });
      awardPoints(Math.round(percentage * 2.5), `Assessment Mastered: ${Math.round(percentage)}%`);
      try {
        const feedback = await getFeedback(scoreCount, activeQuiz.questions.length, activeQuiz.title);
        setAiFeedback(feedback);
      } catch { setAiFeedback("Analysis logged."); }
      finally { setLoadingFeedback(false); }
    }
  };

  const handleAnalyzePath = async (quiz: Quiz) => {
    setAnalyzingQuizId(quiz.id);
    setIsAnalyzing(true);
    setClinicalAnalysis(null);
    try {
      const analysis = await analyzeClinicalPath(quiz.title, quiz.questions, quiz.user_answers || []);
      setClinicalAnalysis(analysis);
      awardPoints(25, "Deep Clinical Analysis Performed");
    } catch (err) {
      setClinicalAnalysis("Communication with the Clinical Core failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const initiateProfessionalQuiz = async () => {
    if (!setupCourseId || !userId) return;
    setIsGenerating(true);
    try {
      const course = courses.find(c => c.id === setupCourseId)!;
      const vaultMaterials = materials.filter(m => m.course_id === setupCourseId).map(m => m.content);
      const allContext = sessionFileContent ? [...vaultMaterials, sessionFileContent] : vaultMaterials;
      
      const questions = await generateProfessionalPharmacyQuiz(
        course.name, 
        allContext, 
        quizSettings.defaultQuestionCount, 
        quizSettings.preferredDifficulty
      );

      if (questions.length > 0) {
        const { data, error } = await supabase.from('quizzes').insert({
          user_id: userId,
          course_id: setupCourseId,
          title: `Professional Evaluation: ${course.name}`,
          questions: questions,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          completed: false
        }).select().single();

        if (data) {
          setQuizzes(prev => [data, ...prev]);
          setActiveQuizId(data.id);
          setViewMode('active');
          awardPoints(100, "Synthesis Protocol Success");
        } else if (error) {
           throw error;
        }
      }
    } catch (err: any) {
      alert(`SYNTHESIS_ERROR: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (viewMode === 'setup') {
    return (
      <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
         <div className="glass p-12 rounded-[50px] border border-cyan-500/20 bg-slate-900/40 relative">
            <div className="hud-corner hud-tl border-cyan-400"></div>
            <h3 className="text-3xl font-bold font-space text-white uppercase tracking-tighter mb-2">Synthesis Wizard</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-10">Construct a professional pharmacy evaluation</p>
            
            <div className="space-y-8">
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">1. Target Module</label>
                  <select 
                    value={setupCourseId}
                    onChange={e => setSetupCourseId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-cyan-500 outline-none appearance-none cursor-pointer"
                  >
                     <option value="">Select Curriculum Node...</option>
                     {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">2. Grounding Source (Optional)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${sessionFile ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/5 hover:bg-white/5'}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.txt" />
                    <ICONS.Materials className={`w-8 h-8 mx-auto mb-4 ${sessionFile ? 'text-cyan-400' : 'text-slate-700'}`} />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-tight">
                       {sessionFile ? sessionFile.name : 'Link Additional Document'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-2 uppercase">PDF Context for Specific Synthesis</p>
                  </div>
               </div>

               <button 
                  onClick={initiateProfessionalQuiz}
                  disabled={!setupCourseId || isGenerating}
                  className="w-full py-5 bg-gradient-to-r from-cyan-600 to-indigo-700 rounded-3xl font-bold uppercase tracking-[0.3em] text-white shadow-2xl shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95 transition-transform"
               >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                      Mining Knowledge Vectors...
                    </>
                  ) : 'Initiate Synthesis Protocol'}
               </button>
               
               <button onClick={() => setViewMode('active')} className="w-full text-[10px] font-bold text-slate-600 hover:text-white uppercase tracking-widest">Return to Terminal</button>
            </div>
         </div>
      </div>
    );
  }

  if (activeQuiz && !showResult) {
    const question = activeQuiz.questions[currentQuestionIndex];
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="glass p-10 rounded-3xl border border-white/10 bg-slate-900/60 relative">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-widest border border-indigo-500/20 rounded-full">
                 {question.category?.toUpperCase() || 'GENERAL'}
               </span>
               <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.3em] animate-pulse">Syncing Response...</span>
            </div>
            <span className="text-sm font-space font-bold text-slate-500">{currentQuestionIndex + 1} / {activeQuiz.questions.length}</span>
          </div>
          <h4 className="text-2xl font-bold mb-10 text-white leading-relaxed font-space uppercase tracking-tight">{question.question}</h4>
          <div className="space-y-4">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const newAnswers = [...answers];
                  newAnswers[currentQuestionIndex] = idx;
                  setAnswers(newAnswers);
                  saveProgress({ user_answers: newAnswers });
                }}
                className={`w-full p-6 rounded-2xl text-left border transition-all duration-200 group relative ${
                  answers[currentQuestionIndex] === idx ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-bold transition-all font-space ${
                    answers[currentQuestionIndex] === idx ? 'bg-cyan-500 text-slate-900' : 'border-white/20 text-slate-500'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="flex-1 font-medium">{option}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-14 flex justify-between">
            <button onClick={() => setActiveQuizId(null)} className="px-8 py-3 text-slate-500 hover:text-white uppercase tracking-widest text-[10px] font-bold">Suspend</button>
            <button 
              disabled={answers[currentQuestionIndex] === -1}
              onClick={handleNext}
              className="px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-2xl font-bold shadow-xl shadow-cyan-500/20 disabled:opacity-50 uppercase tracking-widest text-[10px]"
            >
              {currentQuestionIndex === activeQuiz.questions.length - 1 ? 'Finalize Analysis' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex justify-center">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          {(['active', 'history'] as const).map(mode => (
            <button 
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-10 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${viewMode === mode ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {mode === 'active' ? 'Active Terminal' : 'Revision Vault'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'active' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1">
              <div className="glass p-10 rounded-[50px] border border-cyan-500/20 bg-cyan-500/5 h-full flex flex-col justify-center text-center">
                 <div className="w-20 h-20 bg-cyan-500/10 rounded-[30px] flex items-center justify-center mx-auto mb-8 border border-cyan-500/20">
                    <ICONS.Quiz className="w-10 h-10 text-cyan-400" />
                 </div>
                 <h4 className="text-2xl font-bold font-space text-white uppercase tracking-tighter mb-4">New Assessment</h4>
                 <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-widest mb-10">Ground your evaluation in curriculum documents or session PDFs.</p>
                 <button 
                   onClick={() => setViewMode('setup')}
                   className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-3xl font-bold uppercase tracking-widest text-[10px] shadow-2xl shadow-cyan-600/20 transition-all active:scale-95"
                 >
                   Launch Synthesis
                 </button>
              </div>
           </div>
           
           <div className="lg:col-span-2 space-y-6">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] px-4">Pending Neural Syncs ({quizzes.filter(q => !q.completed).length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {quizzes.filter(q => !q.completed).map(q => (
                    <div key={q.id} className="glass p-8 rounded-[40px] border border-white/10 bg-slate-900/60 relative group">
                       <h5 className="font-bold text-white text-lg uppercase tracking-tight mb-6 truncate">{q.title}</h5>
                       <div className="flex justify-between items-center mt-auto">
                          <span className="text-[9px] font-bold text-slate-600 uppercase">Nodes: {q.questions.length}</span>
                          <button 
                            onClick={() => setActiveQuizId(q.id)}
                            className="px-6 py-2.5 bg-white/5 hover:bg-cyan-500/10 text-[9px] font-bold text-cyan-400 border border-cyan-500/30 rounded-xl uppercase tracking-widest transition-all"
                          >
                            Sync Identity
                          </button>
                       </div>
                    </div>
                 ))}
                 {quizzes.filter(q => !q.completed).length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                       <p className="text-slate-600 uppercase text-[10px] font-bold tracking-widest italic">No pending assessments detected.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {quizzes.filter(q => q.completed).map(quiz => (
                 <div key={quiz.id} className="glass p-10 rounded-[50px] border border-white/5 bg-slate-900/20 relative group hover:border-indigo-500/40 transition-all">
                    <div className="flex justify-between items-start mb-8">
                       <div className="max-w-[70%]">
                          <h5 className="text-white font-bold text-2xl uppercase tracking-tighter font-space mb-2">{quiz.title}</h5>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Completed: {new Date(quiz.created_at || '').toLocaleDateString()}</p>
                       </div>
                       <div className="text-right">
                          <span className="text-5xl font-bold font-space text-cyan-400 tracking-tighter">{Math.round(quiz.score || 0)}%</span>
                          <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">Accuracy_Index</p>
                       </div>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar mb-8 pr-4">
                       {quiz.questions.map((q, i) => {
                          const isCorrect = quiz.user_answers?.[i] === q.correctAnswer;
                          return (
                             <div key={i} className={`p-5 rounded-2xl border transition-all ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                <div className="flex justify-between items-start mb-3">
                                   <p className="text-[12px] font-bold text-slate-200 uppercase tracking-tight pr-4">
                                      {i+1}. {q.question}
                                   </p>
                                   {isCorrect ? (
                                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                   ) : (
                                      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                   )}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Pedagogical Rationale:</p>
                                   <p className="text-[11px] text-slate-300 italic leading-relaxed">
                                      {q.explanation}
                                   </p>
                                   {!isCorrect && (
                                      <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                         <p className="text-[9px] text-emerald-400 font-bold uppercase">Correct Option: {String.fromCharCode(65 + q.correctAnswer)} - {q.options[q.correctAnswer]}</p>
                                      </div>
                                   )}
                                </div>
                             </div>
                          );
                       })}
                    </div>

                    <button 
                      onClick={() => handleAnalyzePath(quiz)}
                      disabled={isAnalyzing && analyzingQuizId === quiz.id}
                      className="w-full py-4 bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 text-[10px] font-bold rounded-2xl uppercase tracking-widest hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                       {isAnalyzing && analyzingQuizId === quiz.id ? (
                         <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent animate-spin rounded-full"></div>
                       ) : (
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       )}
                       Analyze Clinical Path
                    </button>
                 </div>
              ))}
           </div>
           {quizzes.filter(q => q.completed).length === 0 && (
              <div className="py-32 text-center opacity-30 grayscale">
                 <ICONS.Consultant className="w-24 h-24 mx-auto mb-6 text-slate-500" />
                 <p className="text-sm font-bold uppercase tracking-[0.4em]">Revision Vault Empty: Log Assessments to view history</p>
              </div>
           )}
        </div>
      )}

      {/* Analysis Modal */}
      {analyzingQuizId && clinicalAnalysis && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
           <div className="glass w-full max-w-2xl p-10 rounded-[50px] border border-indigo-500/30 relative">
              <div className="hud-corner hud-tl border-indigo-500"></div>
              <div className="hud-corner hud-br border-indigo-500"></div>
              
              <button 
                onClick={() => { setAnalyzingQuizId(null); setClinicalAnalysis(null); }}
                className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
              >
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="flex items-center gap-4 mb-8">
                 <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <ICONS.Stats className="w-8 h-8 text-indigo-400" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold font-space text-white uppercase tracking-tighter">Clinical Remediation Report</h3>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.3em]">Synapse Performance Audit</p>
                 </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
                 <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
                    <FormattedText text={clinicalAnalysis} />
                 </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button 
                   onClick={() => window.print()} 
                   className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-300"
                 >
                   Archive as PDF
                 </button>
                 <button 
                   onClick={() => { setAnalyzingQuizId(null); setClinicalAnalysis(null); }}
                   className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-600/30"
                 >
                   Ackowledge & Sync
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default QuizModule;
