
import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable retrieval for browser-based ESM environments.
 * It checks multiple locations where Netlify or a bundler might inject variables.
 */
const getSafeEnv = (key: string): string => {
  try {
    // 1. Check window.process.env (Common for some polyfills)
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // 2. Check standard process.env (Injected by common bundlers)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
    // 3. Fallback for specific standard Netlify/Vite patterns
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

export const IS_CONFIGURED = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey);

// Use recognizable "missing" values to help diagnosis in the Network tab
const finalUrl = IS_CONFIGURED 
  ? supabaseUrl 
  : 'https://missing-netlify-env-vars.supabase.co';

const finalKey = IS_CONFIGURED 
  ? supabaseAnonKey 
  : 'missing-key-check-netlify-settings';

if (!IS_CONFIGURED) {
  console.warn("SYNAPSE_CORE: Supabase environment variables are missing. App will enter Offline Recovery Mode.");
}

export const supabase = createClient(finalUrl, finalKey);
