
import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable discovery. 
 * Checks build-time, runtime, and manual overrides.
 */
const getSafeEnv = (key: string): string => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`NX_VAL_${key}`);
      if (stored) return stored;

      // Check for Netlify/Vite prefixed variables first
      if ((window as any).process?.env?.[`VITE_${key}`]) return (window as any).process.env[`VITE_${key}`];
      if ((window as any).process?.env?.[key]) return (window as any).process.env[key];
    }
    
    // @ts-ignore
    const env = import.meta.env;
    if (env?.[`VITE_${key}`]) return env[`VITE_${key}`];
    if (env?.[key]) return env[key];
    
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
      if (process.env[key]) return process.env[key];
    }
  } catch (e) {}
  return '';
};

/**
 * RESOLVER: Identifies and repairs Supabase configuration mismatches.
 * It ignores the variable name and looks at the actual string content.
 */
const resolveConfig = () => {
  // Grab everything that might be a config
  const candidates = [
    getSafeEnv('SUPABASE_URL'),
    getSafeEnv('SUPABASE_ANON_KEY'),
    getSafeEnv('URL'),
    getSafeEnv('KEY')
  ].filter(v => v && v.length > 5);

  let resolvedUrl = '';
  let resolvedKey = '';

  candidates.forEach(val => {
    const v = val.trim();
    // Pattern: Supabase Keys are long and often start with eyJ (JWT) or sb_
    if (v.startsWith('eyJ') || v.startsWith('sb_') || v.length > 50) {
      resolvedKey = v;
    } 
    // Pattern: URLs contain dots and usually supabase.co
    else if (v.includes('.') || v.includes('localhost') || v.includes('supabase')) {
      resolvedUrl = v;
    }
    // Pattern: If it's short and alphanumeric, it might be the project ref
    else if (v.length >= 15 && v.length <= 25 && !resolvedUrl) {
      resolvedUrl = `https://${v}.supabase.co`;
    }
  });

  // Final formatting
  if (resolvedUrl && !resolvedUrl.startsWith('http')) {
    resolvedUrl = `https://${resolvedUrl.replace(/^https?:\/\//, '')}`;
    if (!resolvedUrl.includes('supabase.co') && !resolvedUrl.includes(':')) {
      resolvedUrl += '.supabase.co';
    }
  }

  return { url: resolvedUrl, key: resolvedKey };
};

const { url, key } = resolveConfig();

// Config is valid only if we have a real URL and a key
export const IS_CONFIGURED = !!(
  url && 
  url.startsWith('http') && 
  url.includes('.') && 
  key && 
  key.length > 20
);

/**
 * Fallback for manual repair in case auto-fix fails
 */
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

// Use a valid dummy URL to prevent "Failed to fetch" on malformed strings
const finalUrl = IS_CONFIGURED ? url : 'https://placeholder.supabase.co';
const finalKey = IS_CONFIGURED ? key : 'placeholder';

export const supabase = createClient(finalUrl, finalKey);
