import { createClient } from '@supabase/supabase-js';

/**
 * Advanced environment variable discovery for static web environments.
 */
const getSafeEnv = (key: string): string => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`NX_VAL_${key}`);
      if (stored) return stored;

      if ((window as any).process?.env?.[key]) {
        return (window as any).process.env[key];
      }
    }
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  return '';
};

/**
 * SMART DISCOVERY LOGIC
 * Fixes mismatches where Key and URL might be swapped or incorrectly formatted.
 */
const initializeConnection = () => {
  const v1 = getSafeEnv('SUPABASE_URL');
  const v2 = getSafeEnv('SUPABASE_ANON_KEY');

  let url = '';
  let key = '';

  const isUrl = (val: string) => val.includes('supabase.co') || (val.length > 0 && val.length < 40 && !val.includes('sb_') && !val.includes('eyJ'));
  const isKey = (val: string) => val.startsWith('sb_') || val.startsWith('eyJ') || val.length > 50;

  // Case 1: Standard placement
  if (isUrl(v1) && isKey(v2)) {
    url = v1;
    key = v2;
  } 
  // Case 2: Swapped placement (common mismatch)
  else if (isKey(v1) && isUrl(v2)) {
    url = v2;
    key = v1;
  }
  // Case 3: Only one provided, or fallback
  else {
    url = v1 || v2;
    key = v2 || v1;
  }

  // Format the URL properly
  if (url && !url.startsWith('http')) {
    if (url.includes('supabase.co')) {
      url = `https://${url.trim()}`;
    } else if (url.trim().length > 0) {
      url = `https://${url.trim()}.supabase.co`;
    }
  }

  return { url, key };
};

const { url: finalUrl, key: finalKey } = initializeConnection();

export const IS_CONFIGURED = !!(
  finalUrl && 
  finalUrl.startsWith('http') && 
  finalUrl.includes('supabase.co') && 
  finalKey && 
  finalKey.length > 10
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

// Initialize with a safe placeholder if logic fails, but Smart Discovery should handle most cases.
export const supabase = createClient(
  IS_CONFIGURED ? finalUrl : 'https://placeholder.supabase.co',
  IS_CONFIGURED ? finalKey : 'placeholder'
);
