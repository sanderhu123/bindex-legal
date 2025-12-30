import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { onAuthStateChange, getCurrentUser, getSession } from '../services/supabase/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialized: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const appState = useRef(AppState.currentState);

  const refreshSession = async () => {
    try {
      console.log('[AuthContext] Refreshing session...');
      const session = await getSession();
      if (session) {
        const currentUser = await getCurrentUser();
        console.log('[AuthContext] Session refreshed, user:', currentUser?.email || 'null');
        setUser(currentUser);
      } else {
        console.log('[AuthContext] No session to refresh');
        setUser(null);
      }
      setLoading(false);
      setInitialized(true);
    } catch (error) {
      console.error('[AuthContext] Error refreshing session:', error);
      // Network errors are common in Expo Go
      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.warn('[AuthContext] Network error during refresh - this is normal in Expo Go.');
      }
      setUser(null);
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    // Check initial session
    checkSession();

    // Listen for auth state changes
    const subscription = onAuthStateChange(async (user) => {
      console.log('[AuthContext] Auth state changed, user:', user?.email || 'null');
      setUser(user);
      setLoading(false);
      setInitialized(true);
    });

    // Listen for app state changes (when app comes back from browser after OAuth)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AuthContext] App has come to the foreground, checking session...');
        // App has come to the foreground, check if we have a new session
        refreshSession();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.data.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const checkSession = async () => {
    try {
      console.log('[AuthContext] Checking session...');
      const session = await getSession();
      if (session) {
        const currentUser = await getCurrentUser();
        console.log('[AuthContext] Session found, user:', currentUser?.email || 'null');
        setUser(currentUser);
      } else {
        console.log('[AuthContext] No session found');
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] Error checking session:', error);
      // Network errors are common on app startup in Expo Go
      // Don't crash the app, just assume no user is logged in
      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.warn('[AuthContext] Network error on startup - this is normal in Expo Go. Continuing without auth check.');
      }
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

