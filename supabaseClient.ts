
import { createClient } from '@supabase/supabase-js';

/**
 * Advanced environment variable discovery for static web environments.
 */
const getSafeEnv = (key: string): string => {
  try {
    // 1. Check window.process.env (standard polyfill)
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // 2. Check build-time injected process.env
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
    // 3. Check modern ESM import.meta.env (Netlify standard)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
    // 4. Check localStorage fallback
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`NX_VAL_${key}`);
      if (stored) return stored;
    }
  } catch (e) {}
  return '';
};

let rawUrl = getSafeEnv('SUPABASE_URL');
let supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

// Auto-repair URLs: If the user provided a Project ID instead of a URL
const formatUrl = (url: string) => {
  if (!url) return '';
  let clean = url.trim();
  if (!clean.startsWith('http')) {
    // If it's just an ID (e.g. "abc-def"), turn it into a Supabase URL
    if (clean.includes('.')) {
        clean = `https://${clean}`;
    } else {
        clean = `https://${clean}.supabase.co`;
    }
  }
  return clean;
};

const supabaseUrl = formatUrl(rawUrl);
export const IS_CONFIGURED = !!(supabaseUrl && supabaseUrl.includes('supabase.co') && supabaseAnonKey && supabaseAnonKey.length > 20);

export const configureSupabaseManual = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('NX_VAL_SUPABASE_URL', url.trim());
    localStorage.setItem('NX_VAL_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  }
};

const finalUrl = IS_CONFIGURED ? supabaseUrl : 'https://placeholder.supabase.co';
const finalKey = IS_CONFIGURED ? supabaseAnonKey : 'placeholder';

export const supabase = createClient(finalUrl, finalKey);
