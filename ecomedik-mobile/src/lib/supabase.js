import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Supabase credentials (same as the web app .env)
export const SUPABASE_URL = 'https://mxmoaqntryeecaxmkhlz.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bW9hcW50cnllZWNheG1raGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTg5MTksImV4cCI6MjA5MTAzNDkxOX0.t4CwEGvCY6T_gJr-A9-AGrIHFdVkqo0TpEwPaL_ZW1E';

// Secure token storage adapter for Expo
const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // No URL handling on mobile
  },
});
