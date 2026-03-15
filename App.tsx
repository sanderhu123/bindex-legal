import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { initializePersistentCache } from './src/services/api/pokemonApi';
import { performCacheCleanup } from './src/services/cacheManager';
import { initializeRevenueCat, identifyUser } from './src/services/pro/proService';

// Create React Query client with caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes (good balance between freshness and performance)
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep cached data for 10 minutes (can be used as fallback even if stale)
      gcTime: 10 * 60 * 1000, // 10 minutes (previously called 'cacheTime')
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      // Refetch on window focus (good for keeping data fresh)
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is still fresh
      refetchOnMount: false,
    },
  },
});

function AppContent() {
  const { user, loading, initialized } = useAuth();
  const [cacheInitialized, setCacheInitialized] = useState(false);

  // Initialize persistent cache, RevenueCat, and perform cleanup on app startup
  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize RevenueCat for in-app purchases
        await initializeRevenueCat();
        console.log('[App] RevenueCat initialized');

        // Initialize persistent cache
        await initializePersistentCache();
        console.log('[App] Persistent cache initialized');

        // Perform smart cache cleanup (removes cache for binders not opened in 30+ days)
        const cleanupResult = await performCacheCleanup();
        if (!cleanupResult.skipped) {
          console.log('[App] Cache cleanup result:', {
            cleanedBinders: cleanupResult.cleanedBinderIds.length,
          });
        }

        setCacheInitialized(true);
      } catch (error) {
        console.warn('[App] Failed to initialize app:', error);
        setCacheInitialized(true);
      }
    }

    // Safety timeout: if initialization takes more than 10 seconds, skip it and open the app anyway.
    // This prevents the app from being stuck on the loading screen forever.
    const safetyTimeout = setTimeout(() => {
      console.warn('[App] Initialization timed out after 10s - opening app anyway');
      setCacheInitialized(true);
    }, 10000);

    initializeApp().finally(() => clearTimeout(safetyTimeout));
  }, []);

  // Identify user with RevenueCat when they log in
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id).catch((err) =>
        console.warn('[App] Failed to identify user with RevenueCat:', err)
      );
    }
  }, [user?.id]);

  // Show loading screen while checking auth state or initializing cache
  if (!initialized || loading || !cacheInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <StatusBar style="auto" />
      </View>
    );
  }

  // Show auth screens if not logged in, main app if logged in
  return (
    <>
      {user ? <AppNavigator /> : <AuthNavigator />}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </NavigationContainer>
        </QueryClientProvider>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

