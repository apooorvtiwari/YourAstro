import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// If these are missing, it almost always means the env vars weren't present
// at BUILD TIME (Expo bakes EXPO_PUBLIC_* vars into the bundle when it's
// built — setting them in Netlify's dashboard only helps if a build ran
// AFTER they were saved). Fail loudly so this is impossible to miss.
if (!supabaseUrl || !supabaseAnonKey) {
  const message =
    'CONFIGURATION ERROR: Supabase URL or anon key is missing from this build.\n\n' +
    `EXPO_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'present' : 'MISSING'}\n` +
    `EXPO_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'present' : 'MISSING'}\n\n` +
    'This means the environment variables were not available when this build ran. ' +
    'Set them in Netlify → Site settings → Environment variables, then trigger a ' +
    'NEW deploy (env var changes do not apply to already-built bundles).';

  console.error(message);

  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    // Surface this immediately on web so it's impossible to miss, rather
    // than failing silently deep inside a signup/login call later.
    window.alert(message);
  }
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
