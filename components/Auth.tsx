
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [initCode, setInitCode] = useState('');
  const [showInit, setShowInit] = useState(false);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countdown > 0) return;
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isForgotPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) throw resetError;
        setMessage('RECOVERY_PORTAL: Link transmitted. Check your neural inbox.');
      } else if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role: 'student' } }
        });
        
        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('rate limit')) {
            setCountdown(60);
            throw new Error("RATE_LIMIT: Neural gateway overflow. Wait 60s or try 'Login' if you already registered.");
          }
          throw signUpError;
        }
        setMessage('IDENTITY_MANIFESTED: Verification sent. If "Confirm Email" is OFF in Supabase, you can login now.');
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error("ACCESS_DENIED: Neural key or cipher mismatch. Please verify or create a new linkage.");
          }
          throw signInError;
        }
      }
    } catch (err: any) {
      setError(err.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  const handleSystemInit = async () => {
    // Secret provisioning logic for Super Admin
    if (initCode === "NX-ALPHA-77" && email === "kofidugbatey59@gmail.com") {
      setLoading(true);
      try {
        // In a real scenario, this would be an edge function to handle user metadata
        // For this build, we update the profile record and mock the role check in App.tsx
        const { error: pError } = await supabase
          .from('profiles')
          .update({ role: 'super-admin' })
          .eq('email', email); // Assuming email is stored in profile
          
        setMessage("SYSTEM_INIT: Super Admin credentials provisioned for sector [kofidugbatey59]. Proceed to login.");
        setShowInit(false);
      } catch (err) {
        setError("PROVISIONING_FAILED: Secret sequence rejected.");
      } finally {
        setLoading(false);
      }
    } else {
      setError("AUTH_FAILURE: Invalid provisioning cipher.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden" role="main">
      <div className="absolute inset-0 bg-mesh opacity-10" aria-hidden="true"></div>
      <div className="glow-orb bg-cyan-500 w-[600px] h-[600px] -top-20 -left-20 opacity-5 blur-[120px]" aria-hidden="true"></div>
      
      <div className="glass w-full max-w-md p-10 rounded-[40px] border border-white/10 relative z-10 animate-in zoom-in-95 duration-500 shadow-2xl">
        <div className="hud-corner hud-tl border-cyan-500/30"></div>
        <div className="hud-corner hud-br border-cyan-500/30"></div>
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div 
            onClick={() => { if(!showInit) setShowInit(true) }}
            className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/20 mb-6 font-space font-bold text-3xl text-slate-900 animate-pulse cursor-help" aria-hidden="true">NX</div>
          <h1 className="text-3xl font-bold font-space text-white uppercase tracking-tighter">Naesi Xmart</h1>
          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.4em] mt-1">
            {isForgotPassword ? 'RECOVERY_PORTAL' : isSignUp ? 'IDENTITY_MANIFESTATION' : 'NEURAL_ACCESS_STATION'}
          </p>
        </div>

        {showInit ? (
          <div className="space-y-6 animate-in slide-in-from-top-4">
             <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest text-center">Master Provisioning Sequence Detected</p>
             </div>
             <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 block">Admin Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-amber-500 outline-none"
                  placeholder="kofidugbatey59@gmail.com"
                />
             </div>
             <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 block">Init Cipher</label>
                <input 
                  type="password" 
                  value={initCode}
                  onChange={e => setInitCode(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-amber-500 outline-none"
                  placeholder="NX-XXXX-XX"
                />
             </div>
             <button 
                onClick={handleSystemInit}
                className="w-full py-5 bg-amber-600 text-black font-bold uppercase tracking-[0.3em] text-[10px] rounded-2xl shadow-xl shadow-amber-600/20"
             >
                Initialize Secure Role
             </button>
             <button onClick={() => setShowInit(false)} className="w-full text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cancel Init</button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-6" noValidate>
            {isSignUp && (
              <div>
                <label htmlFor="auth-name" className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 block">Student Name</label>
                <input 
                  id="auth-name"
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700 focus-visible:ring-1 focus-visible:ring-cyan-400"
                  placeholder="Designation"
                  required
                  aria-required="true"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 block">Neural Key (Email)</label>
              <input 
                id="auth-email"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700 focus-visible:ring-1 focus-visible:ring-cyan-400"
                placeholder="user@synapse.link"
                required
                aria-required="true"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="auth-password" className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Access Cipher</label>
                  {!isSignUp && (
                    <button type="button" onClick={() => { setIsForgotPassword(true); setError(null); }} className="text-[9px] text-cyan-500 hover:text-cyan-400 font-bold uppercase transition-colors focus-visible:outline-none focus-visible:underline">Forgot Cipher?</button>
                  )}
                </div>
                <input 
                  id="auth-password"
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700 focus-visible:ring-1 focus-visible:ring-cyan-400"
                  placeholder="••••••••"
                  required
                  aria-required="true"
                />
              </div>
            )}

            <div aria-live="assertive">
              {error && (
                <div className={`p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl text-[10px] text-pink-400 font-bold uppercase tracking-widest text-center leading-relaxed ${countdown > 0 ? 'animate-pulse' : ''}`} role="alert">
                  {error} {countdown > 0 && `(RETRY_IN_${countdown}S)`}
                </div>
              )}

              {message && (
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-[10px] text-cyan-400 font-bold uppercase tracking-widest text-center animate-bounce" role="status">
                  {message}
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading || countdown > 0}
              className="w-full py-5 bg-gradient-to-r from-cyan-600 to-indigo-700 rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] text-white shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {loading ? 'SYNCING...' : countdown > 0 ? `WAIT_${countdown}S` : isForgotPassword ? 'SEND_RECOVERY' : isSignUp ? 'MANIFEST_IDENTITY' : 'INITIATE_SESSION'}
            </button>
          </form>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsForgotPassword(false);
              setError(null);
              setMessage(null);
              setShowInit(false);
            }}
            className="text-[10px] text-slate-400 hover:text-cyan-400 font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {isSignUp ? 'Already identified? Login' : 'New Entity? Create Linkage'}
          </button>
          
          {isForgotPassword && (
            <button onClick={() => setIsForgotPassword(false)} className="text-[10px] text-slate-400 hover:text-cyan-400 font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:underline">Return to Neural Access</button>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Connected to Synapse Cloud 4.0</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
