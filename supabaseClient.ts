
import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable retrieval for browser-based ESM environments.
 * If 'process' is not defined (standard browser), we return an empty string 
 * rather than throwing a ReferenceError, allowing the UI to mount and show 
 * a proper connection error.
 */
const getSafeEnv = (key: string): string => {
  try {
    // We check typeof process first to avoid ReferenceError in strictly browser contexts
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch (e) {
    // Fallback for environments where 'process' is restricted
  }
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

// If credentials are missing, we use non-empty placeholders. 
// supabase-js will not throw an error during 'createClient' if the URL is a valid format.
// This allows App.tsx to load and display the 'Neural Gateway Offline' screen instead of a blank page.
const finalUrl = (supabaseUrl && supabaseUrl.startsWith('http')) 
  ? supabaseUrl 
  : 'https://placeholder-project.supabase.co';

const finalKey = supabaseAnonKey || 'placeholder-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("SYNAPSE_CORE_WARNING: Supabase environment variables are missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in Netlify.");
}

export const supabase = createClient(finalUrl, finalKey);
