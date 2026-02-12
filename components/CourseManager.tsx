
import React, { useState, useMemo, useRef } from 'react';
import { Course, Material, Quiz, QuizSettings } from '../types';
import { supabase } from '../supabaseClient';
import { ICONS } from '../constants';

interface CourseManagerProps {
  courses: Course[];
  materials: Material[];
  onAddCourse: (course: any) => void;
  onAddMaterial: (material: any) => void;
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  setQuizzes: React.Dispatch<React.SetStateAction<Quiz[]>>;
  awardPoints: (amount: number, reason: string) => void;
  quizSettings: QuizSettings;
}

const CourseManager: React.FC<CourseManagerProps> = ({ courses, materials, onAddCourse, onAddMaterial, setMaterials, setQuizzes, awardPoints, quizSettings }) => {
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ 
    name: '', 
    description: '',
    term: 'Fall', 
    semester: 1, 
    academic_year: '2024/2025', 
    code: '' 
  });
  const [uploading, setUploading] = useState(false);
  const [materialData, setMaterialData] = useState({ title: '', course_id: '', type: 'pdf' as 'note' | 'pdf', content: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isPdf = file.type === 'application/pdf';
      
      setMaterialData(prev => ({
        ...prev,
        title: file.name.split('.')[0],
        type: isPdf ? 'pdf' : 'note',
      }));

      try {
        if (file.type === 'text/plain') {
          const text = await file.text();
          setMaterialData(prev => ({ ...prev, content: text.substring(0, 30000) }));
        } else {
          const base64 = await fileToBase64(file);
          setMaterialData(prev => ({ ...prev, content: base64 }));
        }
      } catch (err) {
        console.error("File processing error:", err);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !materialData.course_id) return;
    setUploading(true);

    try {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, '_')}`;
      
      let publicUrl = '';
      const { data: storageData, error: storageError } = await supabase.storage
        .from('academy_vault')
        .upload(fileName, selectedFile);

      if (storageError) {
        if (storageError.message.includes('bucket')) {
          throw new Error("STORAGE_BUCKET_MISSING: The 'academy_vault' bucket has not been initialized. Please run the SQL setup script.");
        }
        throw storageError;
      }

      if (storageData) {
        const { data: { publicUrl: url } } = supabase.storage
          .from('academy_vault')
          .getPublicUrl(fileName);
        publicUrl = url;
      }

      const newMat: any = {
        course_id: materialData.course_id,
        title: materialData.title,
        type: materialData.type,
        content: materialData.content,
        file_url: publicUrl,
        date: new Date().toLocaleDateString(),
        bookmarked: false
      };

      await onAddMaterial(newMat);
      setSelectedFile(null);
      setMaterialData({ ...materialData, title: '', content: '' });
      awardPoints(50, "Knowledge Packet Integrated");
    } catch (err: any) {
      console.error("Upload error details:", err);
      alert("UPLOAD_FAILURE: " + (err.message || "Failed to communicate with storage service."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-bold font-space text-white uppercase tracking-tighter">Academy Vault</h3>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Grounding Data Index</p>
        </div>
        <button 
          onClick={() => setShowCourseModal(true)}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-bold transition-all shadow-xl shadow-indigo-600/30 text-white uppercase tracking-widest"
        >
          + Initialize Curriculum Node
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass p-8 rounded-[40px] border border-cyan-500/20 bg-slate-900/60 relative overflow-hidden">
            <h4 className="text-lg font-bold mb-6 font-space text-cyan-400 uppercase tracking-widest flex items-center gap-3">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
               Sync Data Packet
            </h4>
            
            <form onSubmit={handleUpload} className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all group ${selectedFile ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/10 hover:border-cyan-500/30 hover:bg-white/5'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt" />
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${selectedFile ? 'bg-cyan-500 text-slate-900' : 'bg-white/5 text-slate-500 group-hover:text-cyan-400'}`}>
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate max-w-xs mx-auto">
                  {selectedFile ? selectedFile.name : 'Select Curriculum Node'}
                </p>
                <p className="text-[9px] text-slate-600 mt-2 uppercase tracking-tighter">Support: PDF, TXT (MAX 10MB)</p>
              </div>

              <div className="space-y-4">
                <div>
                   <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Parent Module</label>
                   <select 
                    required
                    value={materialData.course_id}
                    onChange={e => setMaterialData({...materialData, course_id: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-cyan-500 outline-none text-white cursor-pointer appearance-none"
                   >
                    <option value="">Select Logical Module...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                   </select>
                </div>
                
                <div>
                   <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Packet Identifier</label>
                   <input 
                    type="text" 
                    required
                    value={materialData.title}
                    onChange={e => setMaterialData({...materialData, title: e.target.value})}
                    placeholder="e.g. Clinical Pharmacokinetics 101"
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-xs focus:border-cyan-500 outline-none text-white"
                   />
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploading || !selectedFile || !materialData.course_id}
                className="w-full py-5 bg-gradient-to-r from-cyan-600 to-indigo-700 rounded-3xl font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:opacity-90 transition-all disabled:opacity-50 text-[10px] text-white shadow-2xl shadow-cyan-500/20 active:scale-95"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    SYNCHRONIZING...
                  </>
                ) : 'INITIATE UPLOAD'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {materials.length === 0 ? (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[50px] opacity-40">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Registry Buffer Empty</p>
                </div>
              ) : (
                materials.map(mat => (
                  <div key={mat.id} className="glass p-8 rounded-[40px] border border-white/5 hover:border-cyan-500/40 transition-all relative group bg-slate-900/40 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                          <div className={`p-4 rounded-2xl border ${mat.type === 'pdf' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                            <ICONS.Materials className="w-6 h-6" />
                          </div>
                          {mat.file_url && (
                            <a href={mat.file_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" title="Download Original">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                          )}
                      </div>
                      <h5 className="font-bold text-white text-xl truncate uppercase tracking-tighter font-space mb-1">{mat.title}</h5>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Module: {courses.find(c => c.id === mat.course_id)?.code || 'GEN'}</p>
                      
                      <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex-1 mb-4 overflow-hidden">
                        <p className="text-[11px] text-slate-400 line-clamp-3 italic leading-relaxed break-all">
                          {mat.type === 'pdf' ? '[ENCRYPTED_BIOMETRIC_DATA]' : mat.content}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                         <span>Sync: {mat.date}</span>
                         <span className="px-2 py-0.5 bg-white/5 rounded-md border border-white/10">{mat.type}</span>
                      </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
      
      {showCourseModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass w-full max-w-xl p-12 rounded-[50px] border border-indigo-500/30 animate-in zoom-in-95 relative overflow-hidden">
            <div className="hud-corner hud-tl border-indigo-500"></div>
            <div className="hud-corner hud-br border-indigo-500"></div>
            
            <h3 className="text-3xl font-bold font-space mb-2 text-white uppercase tracking-tighter">Initialize Module</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-10">Configure new curriculum linkage parameters</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Module Designation</label>
                  <input 
                    type="text" 
                    value={newCourse.name}
                    onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none text-sm font-medium transition-all" 
                    placeholder="e.g. Clinical Pharmacology"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Module Code</label>
                  <input 
                    type="text" 
                    value={newCourse.code}
                    onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none text-sm font-bold uppercase tracking-widest transition-all" 
                    placeholder="e.g. PHM-402"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Academic Year</label>
                  <input 
                    type="text" 
                    value={newCourse.academic_year}
                    onChange={e => setNewCourse({...newCourse, academic_year: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none text-sm transition-all" 
                    placeholder="e.g. 2024/2025"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Semester</label>
                     <select 
                       value={newCourse.semester}
                       onChange={e => setNewCourse({...newCourse, semester: parseInt(e.target.value)})}
                       className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-4 text-white focus:border-indigo-500 outline-none text-sm cursor-pointer appearance-none font-bold text-center"
                     >
                        <option value={1}>01</option>
                        <option value={2}>02</option>
                        <option value={3}>03</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Term</label>
                     <select 
                       value={newCourse.term}
                       onChange={e => setNewCourse({...newCourse, term: e.target.value})}
                       className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-4 text-white focus:border-indigo-500 outline-none text-sm cursor-pointer appearance-none font-bold text-center uppercase tracking-widest"
                     >
                        <option value="Fall">Fall</option>
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                     </select>
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Curriculum Summary</label>
               <textarea 
                  value={newCourse.description}
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none text-sm resize-none h-24"
                  placeholder="Primary therapeutic areas or clinical objectives..."
               />
            </div>

            <div className="flex gap-6 mt-12">
              <button 
                onClick={() => setShowCourseModal(false)} 
                className="flex-1 py-5 text-[11px] font-black text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-colors bg-white/5 rounded-3xl"
              >
                Abort
              </button>
              <button 
                onClick={() => {
                  if(!newCourse.name || !newCourse.code) return;
                  onAddCourse(newCourse);
                  setShowCourseModal(false);
                  setNewCourse({ name: '', description: '', term: 'Fall', semester: 1, academic_year: '2024/2025', code: '' });
                }}
                className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-3xl font-black text-white uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/40 active:scale-95 transition-all"
              >
                Manifest Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManager;
