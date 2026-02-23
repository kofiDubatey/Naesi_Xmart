import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable discovery. 
 * Checks build-time (Vite), runtime, and manual overrides.
 */
const getSafeEnv = (key: string): string => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`NX_VAL_${key}`);
      if (stored) return stored;

      // Check for Vite specific prefixes first
      const viteKey = `VITE_${key}`;
      if ((window as any).process?.env?.[viteKey]) return (window as any).process.env[viteKey];
      if ((window as any).process?.env?.[key]) return (window as any).process.env[key];
    }
    
    // Check Vite's import.meta.env
    // @ts-ignore
    const viteEnv = import.meta.env;
    if (viteEnv?.[key]) return viteEnv[key];
    if (viteEnv?.VITE_SUPABASE_URL && key === 'SUPABASE_URL') return viteEnv.VITE_SUPABASE_URL;
    if (viteEnv?.VITE_SUPABASE_ANON_KEY && key === 'SUPABASE_ANON_KEY') return viteEnv.VITE_SUPABASE_ANON_KEY;
    if (viteEnv?.[`VITE_${key}`]) return viteEnv[`VITE_${key}`];
    
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
      if (process.env[key]) return process.env[key];
    }
  } catch (e) {}
  return '';
};

const resolveConfig = () => {
  const candidates = [
    getSafeEnv('SUPABASE_URL'),
    getSafeEnv('SUPABASE_ANON_KEY'),
  ].filter(v => v && v.length > 5);

  let resolvedUrl = getSafeEnv('SUPABASE_URL');
  let resolvedKey = getSafeEnv('SUPABASE_ANON_KEY');

  // Fallback heuristic if specific keys aren't named standardly
  if (!resolvedUrl || !resolvedKey) {
    const allPossible = [
      getSafeEnv('URL'),
      getSafeEnv('KEY'),
      getSafeEnv('VITE_SUPABASE_URL'),
      getSafeEnv('VITE_SUPABASE_ANON_KEY')
    ].filter(v => v && v.length > 5);

    allPossible.forEach(val => {
      const v = val.trim();
      if (v.startsWith('eyJ') || v.length > 50) resolvedKey = v;
      else if (v.includes('.') || v.includes('supabase')) resolvedUrl = v;
    });
  }

  return { url: resolvedUrl, key: resolvedKey };
};

const { url, key } = resolveConfig();

export const IS_CONFIGURED = !!(
  url && 
  url.startsWith('http') && 
  key && 
  key.length > 20
);

export const configureSupabaseManual = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('NX_VAL_SUPABASE_URL', url.trim());
    localStorage.setItem('NX_VAL_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  }
};

export const clearSupabaseConfig = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('NX_VAL_SUPABASE_URL');
    localStorage.removeItem('NX_VAL_SUPABASE_ANON_KEY');
    window.location.reload();
  }
};

const finalUrl = IS_CONFIGURED ? url : 'https://placeholder.supabase.co';
const finalKey = IS_CONFIGURED ? key : 'placeholder';

export const supabase = createClient(finalUrl, finalKey);
