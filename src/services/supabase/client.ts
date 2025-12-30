// Polyfill for window.localStorage and window.sessionStorage in React Native
// This MUST run before Supabase imports to prevent "runtime not ready" errors
if (typeof window !== 'undefined') {
  const noopStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };
  
  if (!window.localStorage) {
    (window as any).localStorage = noopStorage;
  }
  if (!window.sessionStorage) {
    (window as any).sessionStorage = noopStorage;
  }
}

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { SupabaseClientOptions } from '@supabase/supabase-js';

// Get environment variables
// In Expo, EXPO_PUBLIC_ prefixed vars are available via process.env
// We also check Constants.expoConfig.extra as a fallback
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
Missing Supabase environment variables!

Please ensure your .env file contains:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

After creating/updating .env, restart your Expo dev server.
  `.trim();
  
  console.error('[Supabase Client]', errorMessage);
  throw new Error(errorMessage);
}

console.log('[Supabase Client] Initializing with URL:', supabaseUrl?.substring(0, 30) + '...');

// Custom storage adapter for React Native using AsyncStorage
// This ensures Supabase doesn't try to use window.localStorage
const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('[Supabase Storage] Error getting item:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('[Supabase Storage] Error setting item:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[Supabase Storage] Error removing item:', error);
    }
  },
};

// Create Supabase client with custom storage adapter for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
  // Add timeout and retry configuration for better network handling
  db: {
    schema: 'public',
  },
  realtime: {
    timeout: 10000, // 10 second timeout
  },
} as SupabaseClientOptions<'public'>);

console.log('[Supabase Client] Client created successfully');

