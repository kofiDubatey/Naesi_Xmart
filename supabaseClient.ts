
import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable retrieval for browser-based ESM environments.
 */
const getSafeEnv = (key: string): string => {
  try {
    // 1. Check window.process.env
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // 2. Check standard process.env
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
    // 3. Check localStorage (Fallback for manual user setup)
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`NX_VAL_${key}`);
      if (stored) return stored;
    }
  } catch (e) {}
  return '';
};

let supabaseUrl = getSafeEnv('SUPABASE_URL');
let supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

// Standard validation: URL must start with http and Key must not be empty
export const IS_CONFIGURED = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey);

/**
 * Allows the UI to manually update and persist credentials if the 
 * environment injection fails.
 */
export const configureSupabaseManual = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('NX_VAL_SUPABASE_URL', url);
    localStorage.setItem('NX_VAL_SUPABASE_ANON_KEY', key);
    window.location.reload(); // Reload to re-initialize client
  }
};

const finalUrl = IS_CONFIGURED 
  ? supabaseUrl 
  : 'https://placeholder.supabase.co';

const finalKey = IS_CONFIGURED 
  ? supabaseAnonKey 
  : 'placeholder';

export const supabase = createClient(finalUrl, finalKey);
