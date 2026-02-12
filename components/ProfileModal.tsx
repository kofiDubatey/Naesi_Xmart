
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { generateAvatar } from '../services/geminiService';
import { ICONS } from '../constants';

interface ProfileModalProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onClose: () => void;
  awardPoints: (amount: number, reason: string) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ profile, setProfile, onClose, awardPoints }) => {
  const [activeMode, setActiveMode] = useState<'info' | 'camera' | 'ai'>('info');
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("PERMISSION_DENIED: Browser blocked the sensor request.");
      } else if (err.name === 'NotFoundError') {
        setCameraError("SENSOR_NOT_FOUND: No imaging hardware detected.");
      } else {
        setCameraError("LINK_FAILURE: Biometric sensor failed to initialize.");
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setTempProfile({ ...tempProfile, avatar: dataUrl });
        stopCamera();
        setActiveMode('info');
        awardPoints(25, "Neural Identity Captured");
      }
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const imageUrl = await generateAvatar(aiPrompt);
      setTempProfile({ ...tempProfile, avatar: imageUrl });
      awardPoints(50, "AI Persona Manifested");
      setActiveMode('info');
    } catch (err) {
      console.error("AI Generation failed", err);
      alert("Neural sync failed. Try a different prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveProfile = () => {
    setProfile(tempProfile);
    onClose();
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
      <div className="glass w-full max-w-2xl rounded-[40px] border border-cyan-500/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="flex border-b border-white/5 bg-white/5">
          <button 
            onClick={() => { setActiveMode('info'); stopCamera(); }}
            className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeMode === 'info' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'}`}
          >
            Info
          </button>
          <button 
            onClick={() => { setActiveMode('camera'); startCamera(); }}
            className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeMode === 'camera' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}
          >
            Biometrics
          </button>
          <button 
            onClick={() => { setActiveMode('ai'); stopCamera(); }}
            className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeMode === 'ai' ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-400' : 'text-slate-500'}`}
          >
            Neural AI
          </button>
        </div>

        <div className="p-8">
          {activeMode === 'info' && (
            <div className="flex flex-col md:flex-row gap-10 items-start animate-in fade-in slide-in-from-bottom-4">
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <div className="w-40 h-40 rounded-[32px] overflow-hidden border-2 border-cyan-500/30 relative group shadow-2xl shadow-cyan-500/10">
                  <img src={tempProfile.avatar} className="w-full h-full object-cover" alt="Avatar Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest border border-white/30 px-3 py-1 rounded-full">ACTIVE_SYNC</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-5 w-full">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Identity Designation</label>
                  <input 
                    type="text" 
                    value={tempProfile.name}
                    onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Professional Rank</label>
                  <input 
                    type="text" 
                    value={tempProfile.title}
                    onChange={(e) => setTempProfile({ ...tempProfile, title: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Mission Bio</label>
                  <textarea 
                    value={tempProfile.bio}
                    onChange={(e) => setTempProfile({ ...tempProfile, bio: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-cyan-500 outline-none resize-none h-24 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {activeMode === 'camera' && (
            <div className="animate-in fade-in zoom-in-95">
              <div className="relative aspect-video bg-black rounded-[40px] overflow-hidden border border-white/5 shadow-2xl">
                {cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    {cameraError ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl text-pink-400 font-bold uppercase text-[10px] tracking-widest">
                          {cameraError}
                        </div>
                        <p className="text-slate-500 text-[10px] uppercase leading-relaxed max-w-xs">
                          PLEASE ENSURE CAMERA PERMISSIONS ARE ENABLED IN YOUR BROWSER SETTINGS AND THE IPR PRIVACY CONFIG.
                        </p>
                        <button onClick={startCamera} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all">Retry Linkage</button>
                      </div>
                    ) : (
                      <button onClick={startCamera} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-3">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                         INITIATE_IMAGING_SENSOR
                      </button>
                    )}
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
                {cameraActive && (
                   <div className="absolute bottom-10 inset-x-0 flex justify-center">
                      <button 
                        onClick={capturePhoto}
                        className="w-20 h-20 rounded-full border-4 border-white/20 p-1 flex items-center justify-center group hover:border-white transition-all shadow-2xl"
                      >
                         <div className="w-full h-full rounded-full bg-white group-active:scale-90 transition-transform"></div>
                      </button>
                   </div>
                )}
              </div>
              <p className="text-center text-[10px] text-slate-500 mt-6 uppercase tracking-[0.3em] font-bold">BIOMETRIC_IMAGING_STATION_04</p>
            </div>
          )}

          {activeMode === 'ai' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
              <div className="glass p-8 rounded-[32px] border border-purple-500/20 bg-purple-500/5 relative overflow-hidden">
                <div className="hud-corner hud-tl w-3 h-3 border-purple-400"></div>
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-3">Manifestation Prompt</label>
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Clinical Scientist in a neon lab..."
                  className="w-full bg-slate-950 border border-purple-500/30 rounded-2xl px-6 py-4 text-white focus:border-purple-400 outline-none text-lg transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-6 leading-relaxed uppercase tracking-widest font-bold">
                  Gemini-powered neural synthesis engine. Architects a unique persona based on your prompt.
                </p>
              </div>

              <button 
                onClick={handleGenerateAI}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full py-5 bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl font-bold flex items-center justify-center gap-4 hover:opacity-95 transition-all disabled:opacity-50 text-[10px] uppercase tracking-[0.3em] text-white shadow-xl shadow-purple-900/20"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    SYNTHESIZING_MANIFESTATION...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.618.309a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l-1.16 1.16a2 2 0 000 2.828l1.16 1.16a2 2 0 002.828 0l1.16-1.16a2 2 0 00.547-1.022l.477-2.387a6 6 0 01-.517-3.86l-.309-.618a6 6 0 00-.517-3.86l.477-2.387a2 2 0 00-.547-1.022l-1.16-1.16a2 2 0 00-2.828 0l-1.16 1.16a2 2 0 000 2.828l1.16 1.16a2 2 0 001.022.547l2.387.477a6 6 0 003.86-.517l.618-.309a6 6 0 013.86-.517l2.387.477a2 2 0 001.022-.547l1.16-1.16a2 2 0 000-2.828l-1.16-1.16z" /></svg>
                    MANIFEST_NEURAL_AVATAR
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="p-8 pt-0 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-2xl font-bold transition-all text-slate-500 uppercase tracking-widest text-[10px]"
          >
            Abort Sync
          </button>
          <button 
            onClick={saveProfile}
            className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-slate-900 rounded-2xl font-bold shadow-xl shadow-cyan-600/20 transition-all uppercase tracking-widest text-[10px]"
          >
            Finalize Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
