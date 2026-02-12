
import React, { useState } from 'react';
import { NotificationSettings, QuizSettings, Material, Quiz, TemporalEvent } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../supabaseClient';

interface SettingsViewProps {
  settings: NotificationSettings;
  setSettings: (s: NotificationSettings) => void;
  quizSettings: QuizSettings;
  setQuizSettings: (s: QuizSettings) => void;
  awardPoints: (amount: number, reason: string) => void;
  materials: Material[];
  quizzes: Quiz[];
  temporalEvents: TemporalEvent[];
  setTemporalEvents: (evts: TemporalEvent[]) => void;
  user_id?: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  settings, 
  setSettings, 
  quizSettings, 
  setQuizSettings, 
  awardPoints, 
  materials, 
  quizzes, 
  temporalEvents, 
  setTemporalEvents, 
  user_id 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', time: '12:00', description: '' });

  const saveToSupabase = async (updates: any) => {
    if (!user_id) return;
    setIsSyncing(true);
    try {
      await supabase.from('profiles').update(updates).eq('id', user_id);
    } catch (err) {
      console.error("Failed to persist settings to neural cloud", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggle = (key: keyof NotificationSettings) => {
    const newVal = !settings[key];
    const updated = { ...settings, [key]: newVal };
    setSettings(updated);
    saveToSupabase({ notification_settings: updated });
    if (newVal) awardPoints(5, "Preference Synchronized");
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...settings, digestTime: e.target.value };
    setSettings(updated);
    saveToSupabase({ notification_settings: updated });
  };

  const handleQuizSettingChange = (key: keyof QuizSettings, value: any) => {
    const updated = { ...quizSettings, [key]: value };
    setQuizSettings(updated);
    saveToSupabase({ quiz_settings: updated });
    awardPoints(10, "Neural Assessment Strategy Updated");
  };

  const resetQuizSettings = () => {
    const defaults: QuizSettings = {
      defaultQuestionCount: 5,
      preferredDifficulty: 'standard'
    };
    setQuizSettings(defaults);
    saveToSupabase({ quiz_settings: defaults });
    awardPoints(5, "Assessment Protocol Reset");
  };

  const handleAddManualEvent = async () => {
    if (!selectedDate || !newEvent.title || !user_id) return;
    
    const isoDateStr = selectedDate.toLocaleDateString('en-CA');
    const eventObj = {
      user_id,
      title: newEvent.title,
      date: isoDateStr,
      time: newEvent.time,
      description: newEvent.description
    };

    try {
      const { data, error } = await supabase.from('events').insert(eventObj).select().single();
      if (error) throw error;
      setTemporalEvents([...temporalEvents, data]);
      awardPoints(15, "Temporal Anchor Manifested");
      setShowEventModal(false);
      setNewEvent({ title: '', time: '12:00', description: '' });
    } catch (err) {
      console.error("Failed to save temporal anchor", err);
    }
  };

  const purgeAnchor = async (id: string) => {
    try {
      await supabase.from('events').delete().eq('id', id);
      setTemporalEvents(temporalEvents.filter(e => e.id !== id));
      awardPoints(5, "Temporal Anchor Dissolved");
    } catch (err) {
      console.error("Purge failed", err);
    }
  };

  // Calendar Logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toLocaleDateString();
    const isoDateStr = date.toLocaleDateString('en-CA'); 
    
    const dayEvents: { id: string, type: 'quiz' | 'reminder' | 'manual', title: string, data: any }[] = [];

    // Quiz Deadlines
    if (settings.deadlines) {
      quizzes.forEach(q => {
        if (!q.completed && q.deadline === dateStr) {
          dayEvents.push({ id: q.id, type: 'quiz', title: q.title, data: q });
        }
      });
    }

    // Study Reminders
    if (settings.reminders) {
      materials.forEach(m => {
        // Fix: Changed reminderTime to reminder_time to match the Material interface.
        if (m.bookmarked && m.reminder_time && m.reminder_time.startsWith(isoDateStr)) {
          dayEvents.push({ id: m.id, type: 'reminder', title: m.title, data: m });
        }
      });
    }

    // Manual Temporal Events
    temporalEvents.forEach(evt => {
      if (evt.date === isoDateStr) {
        dayEvents.push({ id: evt.id, type: 'manual', title: evt.title, data: evt });
      }
    });

    return dayEvents;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* Cloud Sync Status Indicator */}
      <div className="flex justify-end px-4">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${isSyncing ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 animate-pulse' : 'border-white/5 bg-slate-900/40 text-slate-500'}`}>
           <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-cyan-400' : 'bg-green-500'}`}></div>
           {isSyncing ? 'Syncing_to_Cloud...' : 'Cloud_Preferences_Linked'}
        </div>
      </div>

      {/* Calendar Section */}
      <div className="glass p-8 rounded-[40px] border border-cyan-500/20 relative overflow-hidden bg-gradient-to-br from-cyan-500/5 to-transparent">
        <div className="hud-corner hud-tl border-cyan-400"></div>
        <div className="hud-corner hud-br border-cyan-400"></div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Calendar Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-space text-white uppercase tracking-tighter">Synaptic Timeline</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Temporal Planning Engine</p>
                    <button 
                      onClick={jumpToToday}
                      className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 hover:bg-cyan-400/20 transition-all uppercase tracking-widest"
                    >
                      Sync to Present
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 glass hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-cyan-400 border border-white/5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-bold font-space text-white uppercase tracking-widest px-4 min-w-[160px] text-center">
                  {currentDate.toLocaleString('default', { month: 'long' })} {year}
                </span>
                <button onClick={nextMonth} className="p-2 glass hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-cyan-400 border border-white/5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-4">{d}</div>
              ))}
              
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 md:h-20 rounded-2xl bg-white/[0.02] border border-white/5 opacity-40"></div>
              ))}
              
              {Array.from({ length: days }).map((_, i) => {
                const day = i + 1;
                const dateObj = new Date(year, month, day);
                const isToday = new Date().toDateString() === dateObj.toDateString();
                const isSelected = selectedDate?.toDateString() === dateObj.toDateString();
                const dayEvents = getEventsForDate(dateObj);
                
                return (
                  <button 
                    key={day}
                    onClick={() => setSelectedDate(dateObj)}
                    className={`h-16 md:h-20 rounded-2xl border transition-all relative group flex flex-col items-center justify-center gap-1 ${
                      isSelected 
                        ? 'bg-cyan-500/20 border-cyan-500/60 shadow-[0_0_25px_rgba(34,211,238,0.2)] ring-1 ring-cyan-500/40 z-10' 
                        : isToday 
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' 
                          : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span className={`text-sm font-bold font-space ${isSelected ? 'text-white' : isToday ? 'text-indigo-400' : 'text-slate-400'}`}>{day}</span>
                    <div className="flex gap-1 absolute bottom-2">
                      {dayEvents.some(e => e.type === 'quiz') && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"></div>
                      )}
                      {dayEvents.some(e => e.type === 'reminder') && (
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                      )}
                      {dayEvents.some(e => e.type === 'manual') && (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse"></div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Details View */}
          <div className="w-full lg:w-96 glass bg-slate-900/40 rounded-3xl p-6 border border-white/5 relative flex flex-col min-h-[400px]">
            <div className="hud-corner hud-tl w-4 h-4 opacity-40"></div>
            <div className="hud-corner hud-br w-4 h-4 opacity-40"></div>
            
            <div className="mb-8 pb-4 border-b border-white/5 flex justify-between items-end">
              <div>
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.3em] mb-1">Target Synchronisation</p>
                <h4 className="text-xl font-bold font-space text-white uppercase tracking-tight">
                  {selectedDate?.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h4>
              </div>
              <button 
                onClick={() => setShowEventModal(true)}
                className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center hover:bg-purple-500/40 transition-all border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                title="Establish Temporal Anchor"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {selectedDateEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 opacity-20 group hover:opacity-40 transition-opacity cursor-pointer" onClick={() => setShowEventModal(true)}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">No Neural Events Detected</p>
                  <button onClick={() => setShowEventModal(true)} className="mt-4 text-[9px] font-bold text-cyan-500 uppercase tracking-[0.3em] hover:text-white transition-colors">Manifest Anchor +</button>
                </div>
              ) : (
                selectedDateEvents.map((event, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border transition-all duration-300 group relative ${
                    event.type === 'quiz' 
                      ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' 
                      : event.type === 'reminder'
                        ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40'
                        : 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40'
                  }`}>
                    {event.type === 'manual' && (
                       <button 
                         onClick={() => purgeAnchor(event.id)}
                         className="absolute top-4 right-4 text-slate-700 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-all"
                         title="Dissolve Anchor"
                       >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${event.type === 'quiz' ? 'bg-amber-500/20 text-amber-500' : event.type === 'reminder' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {event.type === 'quiz' ? <ICONS.Quiz className="w-5 h-5" /> : event.type === 'reminder' ? <ICONS.Materials className="w-5 h-5" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${event.type === 'quiz' ? 'text-amber-500' : event.type === 'reminder' ? 'text-cyan-400' : 'text-purple-400'}`}>
                        {event.type === 'manual' ? 'MANUAL ANCHOR' : `${event.type.toUpperCase()} SIGNAL`}
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-100 leading-tight mb-2 uppercase tracking-tight group-hover:text-white transition-colors">{event.title}</p>
                    {/* Fix: Changed reminderTime to reminder_time to match the Material interface. */}
                    {(event.type === 'reminder' && event.data.reminder_time) || (event.type === 'manual' && event.data.time) ? (
                       <p className={`text-[9px] font-bold uppercase tracking-widest ${event.type === 'manual' ? 'text-purple-400/80' : 'text-cyan-400/80'}`}>
                         Sync Time: {event.type === 'manual' ? event.data.time : event.data.reminder_time.split('T')[1]}
                       </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
           <div className="glass w-full max-w-md p-10 rounded-[40px] border border-purple-500/30 animate-in zoom-in-95 duration-200">
              <h3 className="text-2xl font-bold font-space mb-2 text-white uppercase tracking-tighter">Establish Anchor</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-8">Set a manual study reminder for the timeline</p>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Anchor Identifier</label>
                  <input 
                    type="text" 
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="e.g. Focus Session: Renal Toxicity"
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-purple-500 outline-none text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Target Date</label>
                    <div className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-xs text-slate-400 font-bold uppercase text-center">
                      {selectedDate?.toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Signal Time</label>
                    <input 
                      type="time" 
                      value={newEvent.time}
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-purple-500 outline-none font-bold text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Protocol Description</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    placeholder="Specify objectives for this anchor..."
                    className="w-full h-24 bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-purple-500 outline-none resize-none text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-12">
                <button onClick={() => setShowEventModal(false)} className="flex-1 py-4 text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Abort Manifest</button>
                <button 
                  onClick={handleAddManualEvent}
                  className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-white uppercase tracking-widest shadow-lg shadow-purple-600/20"
                >
                  Confirm Anchor
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Assessment Strategies and Neural Alerts (Remaining code) */}
      <div className="glass p-8 rounded-[40px] border border-indigo-500/20 relative overflow-hidden bg-gradient-to-br from-indigo-500/5 to-transparent">
        <div className="hud-corner hud-tl border-indigo-400"></div>
        <div className="hud-corner hud-br border-indigo-400"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
              <ICONS.Quiz className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-space text-white uppercase tracking-tighter">Assessment Strategies</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Configure AI assessment synthesis parameters</p>
            </div>
          </div>
          <button 
            onClick={resetQuizSettings}
            className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest px-4 py-2 glass rounded-xl border-white/5 transition-all"
          >
            Reset Neural Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Synthesis Difficulty</label>
                <span className="text-[9px] text-indigo-400 font-mono uppercase">Global_Default</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['standard', 'challenging', 'elite'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => handleQuizSettingChange('preferredDifficulty', diff)}
                    className={`py-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                      quizSettings.preferredDifficulty === diff 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                        : 'bg-slate-900 border-white/5 text-slate-500 hover:border-indigo-500/30'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Node Count Per Sync
                </label>
                <span className="text-xl font-bold font-space text-indigo-400">{quizSettings.defaultQuestionCount} QUESTIONS</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="10" 
                step="1"
                value={quizSettings.defaultQuestionCount}
                onChange={(e) => handleQuizSettingChange('defaultQuestionCount', parseInt(e.target.value))}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-white/5"
              />
              <div className="flex justify-between mt-2 text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                <span>Min_Inquiry (3)</span>
                <span>Max_Inquiry (10)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-[40px] border border-white/5 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl">
            <ICONS.Bell className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-space text-white uppercase tracking-tighter">Neural Alert configuration</h3>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">Fine-tune your cognitive notification stream</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              {[
                { id: 'deadlines', label: 'Assessment Deadlines', desc: 'Alerts for upcoming quiz expirations' },
                { id: 'reminders', label: 'Study Reminders', desc: 'Notifications for bookmarked material times' },
                { id: 'achievements', label: 'Milestone Celebrations', desc: 'Instant feedback on XP and Rank gains' },
                { id: 'system', label: 'Neural Updates', desc: 'Platform changes and system messages' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-sm text-slate-200 uppercase tracking-tight">{item.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{item.desc}</p>
                  </div>
                  <button 
                    onClick={() => toggle(item.id as keyof NotificationSettings)}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings[item.id as keyof NotificationSettings] ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings[item.id as keyof NotificationSettings] ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-200 uppercase tracking-tight">Daily Neural Digest</p>
                  <p className="text-[10px] text-slate-500 font-medium">Summary of pending tasks and progress</p>
                </div>
                <button 
                  onClick={() => toggle('dailyDigest')}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.dailyDigest ? 'bg-indigo-500 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.dailyDigest ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              {settings.dailyDigest && (
                <div className="pt-4 border-t border-white/10 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2">Digest Manifestation Time</label>
                  <input 
                    type="time" 
                    value={settings.digestTime}
                    onChange={handleTimeChange}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-pink-500/5 border border-pink-500/20">
              <div>
                <p className="font-bold text-sm text-slate-200 uppercase tracking-tight">Quiet Study Protocol</p>
                <p className="text-[10px] text-slate-500 font-medium">Silence all signals except critical deadlines</p>
              </div>
              <button 
                onClick={() => toggle('quietMode')}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.quietMode ? 'bg-pink-500 shadow-[0_0_10px_rgba(244,114,182,0.5)]' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.quietMode ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
