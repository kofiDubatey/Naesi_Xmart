
import React, { useState, useMemo, useEffect } from 'react';
import { Material, Course } from '../types';
import { GoogleGenAI } from "@google/genai";
import { ICONS } from '../constants';
import { supabase } from '../supabaseClient';
import FormattedText from './FormattedText';

interface CurriculumViewProps {
  materials: Material[];
  courses: Course[];
  setActiveTab: (tab: any) => void;
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  awardPoints: (amount: number, reason: string) => void;
}

const CurriculumView: React.FC<CurriculumViewProps> = ({ materials, courses, setActiveTab, setMaterials, awardPoints }) => {
  const [globalSummary, setGlobalSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'doc' | 'note'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showReminderModal, setShowReminderModal] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState("12:00");

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const typeMatch = filterType === 'all' || m.type === filterType;
      const searchMatch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.content.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
  }, [materials, filterType, searchQuery]);

  const fetchGlobalSummary = async () => {
    if (materials.length === 0) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const aggregateContent = materials.slice(0, 10).map(m => `--- ${m.title} ---\n${m.content.substring(0, 500)}`).join('\n\n');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As a Lead Pharmacy Academic Strategist, analyze the following document fragments which represent the student's current curriculum. 
        Provide a global neural overview that discusses themes, clinical focus, and learning gaps.
        
        CURRICULUM_DATA:
        ${aggregateContent}`,
      });
      setGlobalSummary(response.text || "Insight manifested but stream is silent.");
    } catch (err) {
      console.error("Global summary failure:", err);
      setGlobalSummary("Unable to synchronize global insights at this time.");
    } finally {
      setIsSummarizing(false);
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
      awardPoints(15, "Temporal Sync Established");
    } catch (err) {
      console.error("Failed to sync temporal reminder", err);
    }
  };

  useEffect(() => {
    if (materials.length > 0 && !globalSummary) {
      fetchGlobalSummary();
    }
  }, [materials]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-24">
      <section className="glass p-10 rounded-[50px] border border-cyan-500/20 relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent">
        <header className="mb-10">
           <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              NEURAL_CURRICULUM_SYNTHESIS
           </p>
           <h2 className="text-4xl font-bold font-space text-white uppercase tracking-tighter">AI Curriculum Overview</h2>
        </header>

        <div className="max-w-4xl relative">
           {isSummarizing ? (
              <div className="flex items-center gap-6 text-slate-500 p-8 border border-dashed border-white/10 rounded-3xl animate-pulse bg-black/20">
                 <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent animate-spin rounded-full"></div>
                 <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-cyan-400">Synchronizing curriculum vectors...</p>
              </div>
           ) : globalSummary ? (
              <FormattedText text={globalSummary} className="animate-in fade-in duration-1000" />
           ) : (
              <div className="p-12 border-2 border-dashed border-white/5 rounded-[40px] text-center bg-black/20">
                <p className="text-slate-600 italic text-sm uppercase tracking-[0.2em] font-bold">Registry offline: Upload curriculum packets.</p>
              </div>
           )}
        </div>
      </section>

      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 px-4">
           <div>
              <h3 className="text-2xl font-bold font-space text-white uppercase tracking-widest border-l-4 border-indigo-500 pl-4">Knowledge Registry</h3>
           </div>
           
           <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Filter registry packets..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-80 bg-slate-900/80 border border-white/10 rounded-2xl px-8 py-4 text-xs text-white focus:border-indigo-500 outline-none"
              />
              <div className="flex bg-slate-900 rounded-2xl border border-white/10 p-1.5">
                 {(['all', 'pdf', 'doc', 'note'] as const).map(type => (
                   <button 
                     key={type}
                     onClick={() => setFilterType(type)}
                     className={`px-5 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${filterType === type ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     {type}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {filteredMaterials.map(mat => {
              const course = courses.find(c => c.id === mat.course_id);
              return (
                 <div key={mat.id} className="glass p-7 rounded-[35px] border border-white/5 hover:border-indigo-500/40 transition-all relative group bg-gradient-to-br from-white/5 to-transparent overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                       <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                          <ICONS.Materials className="w-6 h-6" />
                       </div>
                       <button 
                         onClick={() => setShowReminderModal(mat.id)}
                         className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20"
                       >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       </button>
                    </div>

                    <h4 className="font-bold text-base text-white mb-1 uppercase tracking-tight font-space truncate">{mat.title}</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-6">
                       Module: {course?.name || 'General Archive'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                       <span className="text-[8px] text-slate-600 uppercase font-bold">Sync: {mat.date}</span>
                       <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[7px] font-bold rounded uppercase">{mat.type}</span>
                    </div>
                 </div>
              );
           })}
        </div>
      </section>

      {showReminderModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="glass w-full max-w-md p-10 rounded-[40px] border border-purple-500/30 animate-in zoom-in-95 relative overflow-hidden">
              <h4 className="font-space font-bold mb-8 text-white uppercase tracking-tighter text-2xl">Temporal Sync</h4>
              <div className="grid grid-cols-2 gap-4 mb-10">
                  <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-bold" />
                  <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-bold" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowReminderModal(null)} className="flex-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 rounded-2xl">Abort</button>
                <button onClick={() => setManualReminder(showReminderModal)} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest">Commit</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumView;
