
import React, { useState, useMemo } from 'react';
import { Material, Course } from '../types';
import { ICONS } from '../constants';
import { generateSummary } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import FormattedText from './FormattedText';

interface BookmarksViewProps {
  materials: Material[];
  courses: Course[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  awardPoints: (amount: number, reason: string) => void;
  profileName?: string;
  profileTitle?: string;
}

const BookmarksView: React.FC<BookmarksViewProps> = ({ 
  materials, 
  courses, 
  setMaterials, 
  awardPoints,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const bookmarked = useMemo(() => materials.filter(m => m.bookmarked), [materials]);

  const filteredBookmarked = useMemo(() => {
    return bookmarked.filter(m => {
      const matchesSearch = !searchTerm.trim() || (
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchesSearch;
    });
  }, [bookmarked, searchTerm]);

  const toggleBookmark = async (id: string) => {
    const material = materials.find(m => m.id === id);
    if (!material) return;
    const nextStatus = !material.bookmarked;
    try {
      const { error } = await supabase.from('materials').update({ bookmarked: nextStatus }).eq('id', id);
      if (error) throw error;
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, bookmarked: nextStatus } : m));
      if (!nextStatus) {
        awardPoints(2, "Node De-indexed from Critical Vault");
      }
    } catch (err) {
      console.error("Bookmark fail", err);
    }
  };

  const handleGenerateSummary = async (material: Material) => {
    if (loadingSummary) return;
    setLoadingSummary(material.id);
    try {
      const summary = await generateSummary(material.content, material.title);
      setSummaries(prev => ({ ...prev, [material.id]: summary }));
      awardPoints(20, "Critical Node AI Synthesis Complete");
    } catch (err) {
      console.error("Summary failed", err);
    } finally {
      setLoadingSummary(null);
    }
  };

  const purgeVault = async () => {
    try {
      const ids = bookmarked.map(m => m.id);
      if (ids.length === 0) return;
      
      const { error } = await supabase.from('materials').update({ bookmarked: false }).in('id', ids);
      if (error) throw error;
      
      setMaterials(prev => prev.map(m => ids.includes(m.id) ? { ...m, bookmarked: false } : m));
      awardPoints(10, "Critical Vault Purge Protocol Executed");
      setShowPurgeConfirm(false);
    } catch (err) {
      console.error("Purge failed", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Vault Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-900/40 p-8 rounded-[40px] border border-white/5 relative overflow-hidden">
        <div className="hud-corner hud-tl border-pink-500"></div>
        <div className="hud-corner hud-br border-pink-500"></div>
        <div>
          <h3 className="text-3xl font-bold font-space uppercase tracking-tighter text-white border-l-4 border-pink-500 pl-4">Critical Vault</h3>
          <p className="text-[10px] text-pink-400 mt-1 uppercase tracking-widest font-bold">Priority Neural Hub</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <input 
              type="text"
              placeholder="Query Priority Nodes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-12 py-4 text-xs text-white focus:border-pink-500 outline-none transition-all"
            />
            <svg className="w-4 h-4 text-pink-500 absolute left-4 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          
          <button 
            onClick={() => setShowPurgeConfirm(true)}
            className="px-6 py-4 bg-pink-500/10 hover:bg-pink-600 text-pink-500 hover:text-white border border-pink-500/20 rounded-2xl transition-all group"
            title="Purge Vault"
          >
            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Bookmarked Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredBookmarked.map(mat => {
          const course = courses.find(c => c.id === mat.course_id);
          const hasSummary = !!summaries[mat.id];
          const isSyncPending = !!mat.reminder_time;

          return (
            <div key={mat.id} className="glass p-8 rounded-[45px] border border-pink-500/10 hover:border-pink-500/30 transition-all relative group bg-gradient-to-br from-pink-500/5 to-transparent flex flex-col min-h-[350px]">
              <div className="hud-corner hud-tl border-pink-500/20"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl border ${isSyncPending ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'}`}>
                  <ICONS.Bookmark className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleGenerateSummary(mat)}
                    disabled={loadingSummary === mat.id}
                    className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5"
                    title="AI Synthesis Summary"
                  >
                    {loadingSummary === mat.id ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin rounded-full"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                  </button>
                  <button 
                    onClick={() => toggleBookmark(mat.id)}
                    className="text-pink-500 hover:text-white transition-all p-3 bg-pink-500/5 hover:bg-pink-600 rounded-xl border border-pink-500/20"
                    title="Remove from Vault"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <h5 className="font-bold text-slate-100 text-xl mb-1 uppercase font-space tracking-tight truncate">{mat.title}</h5>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{course?.code || 'GEN'}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{course?.name}</span>
                </div>

                {hasSummary ? (
                  <div className="mt-4 p-5 rounded-3xl bg-black/40 border border-pink-500/10 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest mb-2">Neural Summary</p>
                    <FormattedText text={summaries[mat.id]} className="text-[11px] leading-relaxed italic" />
                  </div>
                ) : (
                  <div className="mt-4 p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center min-h-[100px] text-center opacity-40 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Synthesis Not Requested</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full ${isSyncPending ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`}></div>
                   <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Registered: {mat.date}</span>
                 </div>
                 {isSyncPending && (
                   <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
                     Sync: {mat.reminder_time?.split('T')[0]}
                   </div>
                 )}
              </div>
            </div>
          );
        })}

        {filteredBookmarked.length === 0 && (
          <div className="col-span-full py-40 text-center flex flex-col items-center justify-center opacity-30 grayscale transition-all hover:grayscale-0 hover:opacity-100 cursor-default">
            <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mb-8 border border-pink-500/20">
              <ICONS.Bookmark className="w-10 h-10 text-pink-500" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-slate-400">Vault Nodes Offline</p>
            <p className="text-[10px] uppercase font-bold tracking-widest mt-2 text-slate-600">Index curriculum packets as critical for rapid access</p>
          </div>
        )}
      </div>

      {/* Purge Confirm Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="glass w-full max-w-md p-10 rounded-[40px] border border-pink-500/30 text-center relative overflow-hidden">
              <div className="hud-corner hud-tl border-pink-500"></div>
              <div className="hud-corner hud-br border-pink-500"></div>
              
              <div className="w-16 h-16 bg-pink-500/10 rounded-[24px] flex items-center justify-center mx-auto mb-8 border border-pink-500/20">
                 <svg className="w-8 h-8 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              
              <h4 className="text-2xl font-bold font-space text-white uppercase tracking-tighter mb-2">Purge Vault?</h4>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-10 leading-relaxed">
                Warning: This protocol will de-index ALL priority nodes. The material remains in the Academy Vault, but critical links will be severed.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPurgeConfirm(false)} 
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 font-bold uppercase tracking-widest text-[10px] rounded-2xl transition-all"
                >
                  Abort Purge
                </button>
                <button 
                  onClick={purgeVault}
                  className="flex-1 py-4 bg-pink-600 hover:bg-pink-500 text-white font-bold uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-pink-600/30 transition-all active:scale-95"
                >
                  Confirm Purge
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BookmarksView;
