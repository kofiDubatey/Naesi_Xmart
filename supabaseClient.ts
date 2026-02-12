
import { createClient } from '@supabase/supabase-js';

/**
 * Enhanced environment variable retrieval.
 * Checks multiple common locations for injected variables in browser environments.
 */
const getSafeEnv = (key: string): string => {
  try {
    // 1. Try standard process.env (bundler replacement)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // 2. Try window.process (some browser environments)
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
  } catch (e) {
    // Silent catch
  }
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

/**
 * CRITICAL: Supabase createClient will throw if the URL doesn't look like a URL.
 * We provide a well-formatted fallback so the React app can mount and show 
 * our custom "Neural Gateway Offline" error screen.
 */
const finalUrl = (supabaseUrl && supabaseUrl.startsWith('http')) 
  ? supabaseUrl 
  : 'https://placeholder-project.supabase.co';

const finalKey = supabaseAnonKey || 'placeholder-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("SYNAPSE_CORE_WARNING: Supabase environment variables are missing. Please verify Netlify configuration.");
}

export const supabase = createClient(finalUrl, finalKey);
