
import { createClient } from '@supabase/supabase-js';

/**
 * Robust environment variable retrieval for browser-based ESM environments.
 * Checks multiple common injection targets used by Netlify and modern build tools.
 */
const getSafeEnv = (key: string): string => {
  try {
    // 1. Try standard process.env (often injected by bundlers)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // 2. Try window.process (some serverless injection patterns)
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // 3. Try import.meta.env (standard for Vite/ESM builds)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Silent catch for environments where these lookups throw
  }
  return '';
};

const supabaseUrl = getSafeEnv('SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('SUPABASE_ANON_KEY');

/**
 * CRITICAL DIAGNOSTIC: 
 * If the environment variables are not correctly injected, we use a recognizable 
 * domain to help identify the issue in the console/network tab.
 */
export const IS_CONFIGURED = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey);

const finalUrl = IS_CONFIGURED 
  ? supabaseUrl 
  : 'https://missing-netlify-env-vars.supabase.co';

const finalKey = IS_CONFIGURED 
  ? supabaseAnonKey 
  : 'missing-key-check-netlify-settings';

if (!IS_CONFIGURED) {
  console.error(
    "SYNAPSE_CORE_CRITICAL_FAILURE: Supabase configuration is missing.\n" +
    "1. Go to Netlify Dashboard > Site Configuration > Environment Variables.\n" +
    "2. Add SUPABASE_URL and SUPABASE_ANON_KEY.\n" +
    "3. Re-deploy the site (Clear cache and deploy)."
  );
}

export const supabase = createClient(finalUrl, finalKey);
