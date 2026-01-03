import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { initializePersistentCache } from './src/services/api/pokemonApi';

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

  // Initialize persistent cache on app startup
  useEffect(() => {
    initializePersistentCache()
      .then(() => {
        console.log('[App] Persistent cache initialized');
        setCacheInitialized(true);
      })
      .catch((error) => {
        console.warn('[App] Failed to initialize cache:', error);
        setCacheInitialized(true); // Continue anyway
      });
  }, []);

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
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
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

