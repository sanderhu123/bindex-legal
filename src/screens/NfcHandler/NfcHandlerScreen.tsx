import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { handleNfcTag, subscribeToNfcLinks, extractNfcTagIdFromUrl } from '../../utils/nfcHandler';
import { Linking } from 'react-native';
import type { NfcHandleResult } from '../../utils/nfcHandler';
import MigrationScreen from '../Migration/MigrationScreen';
import { isProgressCacheMigrationCompleted } from '../../utils/migrationCheck';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface NfcHandlerScreenProps {
  navigation: any;
  route: any;
}

/**
 * NFC Handler Screen
 * 
 * This is the app's entry point. It handles:
 * 1. Migration check (first time only)
 * 2. NFC tag detection (if app was launched via NFC deep link)
 * 3. Routing to the correct screen (new tag → questionnaire, existing tag → binder)
 * 4. Fallback to binder list if no NFC tag detected
 */
export default function NfcHandlerScreen({ navigation, route }: NfcHandlerScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMigration, setShowMigration] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);
  const [newTagId, setNewTagId] = useState<string | null>(null);

  useEffect(() => {
    // First, check if migration is needed
    checkMigration();
  }, []);

  useEffect(() => {
    // Only proceed with NFC handling after migration check
    if (!migrationChecked) return;

    // Check if tagId was passed via route params
    const tagId = route.params?.tagId;
    
    if (tagId) {
      handleNfcTagFromId(tagId);
    } else {
      // Check for initial URL (app launched via NFC deep link)
      checkInitialUrl();
      
      // Subscribe to NFC links while app is running
      // (handles tapping an NFC tag while app is already open)
      const subscription = subscribeToNfcLinks(handleNfcResult);
      
      return () => {
        subscription.remove();
      };
    }
  }, [migrationChecked]);

  const checkMigration = async () => {
    try {
      const migrationCompleted = await isProgressCacheMigrationCompleted();
      
      if (!migrationCompleted) {
        setShowMigration(true);
      } else {
        setMigrationChecked(true);
      }
    } catch (error) {
      console.error('[NFC] Error checking migration:', error);
      setMigrationChecked(true);
    }
  };

  const handleMigrationComplete = () => {
    setShowMigration(false);
    setMigrationChecked(true);
  };

  const checkInitialUrl = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      console.log('[NFC] Initial URL:', initialUrl);
      
      if (initialUrl) {
        const tagId = extractNfcTagIdFromUrl(initialUrl);
        if (tagId) {
          console.log('[NFC] Tag ID from initial URL:', tagId);
          handleNfcTagFromId(tagId);
          return;
        }
      }
    } catch (error) {
      console.error('[NFC] Error checking initial URL:', error);
    }
    
    // No NFC tag found, navigate to binder list
    setLoading(false);
    navigation.replace('BinderList');
  };

  const handleNfcTagFromId = async (tagId: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('[NFC] Processing tag:', tagId);
      const result = await handleNfcTag(tagId);
      handleNfcResult(result);
    } catch (error: any) {
      console.error('[NFC] Error processing tag:', error);
      setError(error.message || 'Failed to process NFC tag');
      setLoading(false);
    }
  };

  const handleNfcResult = (result: NfcHandleResult) => {
    setLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Failed to process NFC tag');
      return;
    }

    if (result.isNewTag && result.tagId) {
      // New tag detected — show "new binder" screen
      console.log('[NFC] New tag detected:', result.tagId);
      setNewTagId(result.tagId);
    } else if (result.binder) {
      // Existing tag — go directly to binder
      console.log('[NFC] Existing tag, opening binder:', result.binder.id);
      navigation.replace('BinderDetail', { binderId: result.binder.id });
    } else {
      // Fallback — go to binder list
      navigation.replace('BinderList');
    }
  };

  const handleStartSetup = () => {
    if (newTagId) {
      // Navigate to questionnaire with the NFC tag ID
      // The questionnaire will link the new binder to this tag
      navigation.replace('Questionnaire', { nfcTagId: newTagId });
    }
  };

  const handleGoToBinderList = () => {
    navigation.replace('BinderList');
  };

  // Show migration screen if needed
  if (showMigration) {
    return <MigrationScreen onComplete={handleMigrationComplete} />;
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoToBinderList}>
            <Text style={styles.primaryButtonText}>Go to My Binders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show "new binder detected" screen
  if (newTagId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.newBinderIcon}>+</Text>
          <Text style={styles.newBinderTitle}>New Binder Detected!</Text>
          <Text style={styles.newBinderMessage}>
            This NFC tag isn't linked to a binder yet. Let's set up your new binder!
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartSetup}>
            <Text style={styles.primaryButtonText}>Set Up Binder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoToBinderList}>
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Reading binder...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback (shouldn't reach here normally)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  // Loading state
  loadingText: {
    fontSize: typography.base,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  // Error state
  errorIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.error,
    width: 80,
    height: 80,
    lineHeight: 80,
    textAlign: 'center',
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.error,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  errorTitle: {
    fontSize: typography.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  // New binder detected state
  newBinderIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    width: 80,
    height: 80,
    lineHeight: 80,
    textAlign: 'center',
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  newBinderTitle: {
    fontSize: typography.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  newBinderMessage: {
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: typography.base,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textTertiary,
    fontSize: typography.sm,
  },
});
