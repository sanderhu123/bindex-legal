import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { initializePersistentCache } from './src/services/api/pokemonApi';
import { performCacheCleanup } from './src/services/cacheManager';
import { initializeRevenueCat, identifyUser } from './src/services/pro/proService';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { lightColors } from './src/constants/theme';

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
  const { colors, isDark } = useTheme();
  const [cacheInitialized, setCacheInitialized] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        await initializeRevenueCat();
        console.log('[App] RevenueCat initialized');

        await initializePersistentCache();
        console.log('[App] Persistent cache initialized');

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

    const safetyTimeout = setTimeout(() => {
      console.warn('[App] Initialization timed out after 10s - opening app anyway');
      setCacheInitialized(true);
    }, 10000);

    initializeApp().finally(() => clearTimeout(safetyTimeout));
  }, []);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id).catch((err) =>
        console.warn('[App] Failed to identify user with RevenueCat:', err)
      );
    }
  }, [user?.id]);

  if (!initialized || loading || !cacheInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <>
      {user ? <AppNavigator /> : <AuthNavigator />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fontsLoaded) {
        console.warn('[App] Font loading timed out after 5s — proceeding with system fonts');
        setFontTimeout(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontError) {
      console.warn('[App] Font loading error:', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontTimeout && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={lightColors.primary} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </NavigationContainer>
          </QueryClientProvider>
          <Toast />
        </ThemeProvider>
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

