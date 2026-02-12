
import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable retrieval.
 * We check if 'process' is defined to avoid ReferenceErrors in pure browser environments.
 * If variables are missing, we fall back to placeholders to prevent createClient from throwing an immediate error.
 */
const getEnv = (key: string): string => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[key]) || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

/**
 * CRITICAL FIX: supabase-js throws an error if initialized with an empty string.
 * We use dummy values if the real ones are missing so the App can mount and 
 * the 'dbError' logic in App.tsx can show a friendly error message to the user.
 */
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://missing-project-url.supabase.co';
  
const validKey = supabaseAnonKey || 'missing-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "SUPABASE_CONFIG_MISSING: The application is running without valid Supabase credentials. " +
    "Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your Netlify/Environment variables."
  );
}

export const supabase = createClient(validUrl, validKey);
