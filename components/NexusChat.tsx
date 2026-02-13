import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Course, Material, ChatMessage, SavedDiscussion } from '../types';
import { supabase } from '../supabaseClient';
import { ICONS } from '../constants';
import { getAiClient } from '../services/geminiService';
import FormattedText from './FormattedText';

interface NexusChatProps {
  courses: Course[];
  materials: Material[];
  userId: string;
  onAwardPoints: (amount: number, reason: string) => void;
}

const NexusChat: React.FC<NexusChatProps> = ({ courses, materials, userId, onAwardPoints }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeMaterialIds, setActiveMaterialIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [savedDiscussions, setSavedDiscussions] = useState<SavedDiscussion[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
  const courseMaterials = useMemo(() => materials.filter(m => m.course_id === selectedCourseId), [materials, selectedCourseId]);

  useEffect(() => {
    fetchSavedDiscussions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping]);

  useEffect(() => {
    if (selectedCourseId) {
      const ids = materials.filter(m => m.course_id === selectedCourseId).map(m => m.id);
      setActiveMaterialIds(new Set(ids));
    }
  }, [selectedCourseId, materials]);

  const fetchSavedDiscussions = async () => {
    const { data } = await supabase.from('discussions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setSavedDiscussions(data);
  };

  const startNewDiscussion = (courseId: string) => {
    setSelectedCourseId(courseId);
    setHistory([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedCourseId || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setInput('');
    setIsTyping(true);

    try {
      const ai = getAiClient();
      const selectedMaterials = courseMaterials.filter(m => activeMaterialIds.has(m.id));
      const context = selectedMaterials.length > 0 
        ? `Knowledge nodes: ${selectedMaterials.map(m => m.title).join(', ')}`
        : `No documents linked.`;

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: `You are a Senior Pharmaceutical Consultant. Always provide highly structured, formal responses. Use Markdown headings (###) for sections and bullet points (*) for lists. ${context}` },
      });

      const response = await chat.sendMessage({ message: input });
      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response.text }] };
      const updatedHistory = [...newHistory, modelMessage];
      setHistory(updatedHistory);
      onAwardPoints(5, "Knowledge Exchange Performed");
    } catch (err: any) {
      console.error("AI Communication Failure:", err);
      setHistory([...newHistory, { 
        role: 'model', 
        parts: [{ text: `NEURAL_LINK_FAILURE: ${err.message || 'The terminal encountered an unexpected interrupt'}. Please ensure your environment credentials are correct.` }] 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-14rem)] flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-80 flex flex-col gap-6">
        <div className="glass rounded-[32px] border border-white/5 flex flex-col bg-slate-900/40 h-1/3 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="font-bold text-[10px] text-cyan-400 uppercase tracking-widest">Module_Nexus</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {courses.map(course => (
              <button key={course.id} onClick={() => startNewDiscussion(course.id)} className={`w-full p-4 rounded-2xl text-left transition-all ${selectedCourseId === course.id ? 'bg-cyan-500/20 border border-cyan-500/30' : 'hover:bg-white/5'}`}>
                <p className="font-bold text-xs text-slate-200 uppercase">{course.name}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="glass rounded-[32px] border border-cyan-500/20 flex flex-col bg-cyan-500/5 h-2/3 overflow-hidden">
          <div className="p-6 border-b border-white/5">
             <h3 className="font-bold text-[10px] text-white uppercase tracking-widest">Knowledge_Core</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {courseMaterials.map(mat => (
              <div key={mat.id} onClick={() => {
                const next = new Set(activeMaterialIds);
                if (next.has(mat.id)) next.delete(mat.id); else next.add(mat.id);
                setActiveMaterialIds(next);
              }} className={`p-4 rounded-2xl cursor-pointer border transition-all ${activeMaterialIds.has(mat.id) ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-900/50 border-white/5'}`}>
                <p className="text-[10px] text-white font-bold">{mat.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 glass rounded-[40px] border border-white/5 flex flex-col overflow-hidden bg-slate-900/20 relative">
        {!selectedCourseId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <h3 className="text-2xl font-bold font-space text-white uppercase tracking-tighter mb-2">Nexus Terminal Offline</h3>
             <p className="text-xs text-slate-500 uppercase tracking-widest">Select a curriculum module to initiate neural link</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 className="font-bold font-space text-lg text-white uppercase">{selectedCourse?.name}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {history.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-6 rounded-[32px] max-w-[90%] ${msg.role === 'user' ? 'bg-cyan-600/20 border-cyan-500/30 ml-auto' : 'bg-slate-900 border-white/5'}`}>
                    {msg.role === 'model' ? (
                      <FormattedText text={msg.parts[0].text} />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.parts[0].text}</p>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-[10px] text-slate-500 animate-pulse uppercase tracking-widest">Synthesizing_Analysis...</div>}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-8 bg-slate-950/50 border-t border-white/5">
                <div className="flex gap-4">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Consult nexus..." className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-8 py-5 focus:border-cyan-500 outline-none text-white placeholder:text-slate-700" />
                  <button type="submit" disabled={isTyping} className="px-8 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all">Transmit</button>
                </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default NexusChat;