import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import { fixExistingBinders } from '../../utils/fixExistingBinders';
import { 
  isProgressCacheMigrationCompleted, 
  markProgressCacheMigrationCompleted 
} from '../../utils/migrationCheck';
import { colors, spacing, typography, screenPadding } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface MigrationScreenProps {
  onComplete: () => void;
}

/**
 * Screen shown during one-time migration
 * This automatically fixes existing binders after the progress caching update
 */
export default function MigrationScreen({ onComplete }: MigrationScreenProps) {
  const [status, setStatus] = useState<string>('Checking for updates...');
  const [details, setDetails] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runMigration();
  }, []);

  const runMigration = async () => {
    try {
      // Check if migration was already completed
      const alreadyCompleted = await isProgressCacheMigrationCompleted();
      
      if (alreadyCompleted) {
        console.log('✅ Migration already completed, skipping...');
        onComplete();
        return;
      }

      // Run the migration
      setStatus('Updating your binders...');
      setDetails('This is a one-time process that will only take a moment.');

      console.log('🔧 Starting automatic binder migration...');

      const result = await fixExistingBinders();

      if (result.success || result.fixed > 0) {
        // Migration successful
        setStatus('Update complete!');
        setDetails(`✅ Fixed ${result.fixed} binder${result.fixed !== 1 ? 's' : ''}`);
        
        // Mark as completed
        await markProgressCacheMigrationCompleted();
        
        console.log('✅ Migration completed successfully');
        
        // Wait a moment to show success message, then continue
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        // Migration had errors
        setError('Some binders could not be updated. You can fix them manually later.');
        
        // Still mark as completed so we don't keep trying
        await markProgressCacheMigrationCompleted();
        
        // Continue anyway after showing error
        setTimeout(() => {
          onComplete();
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ Migration error:', error);
      setError(error.message || 'Update failed');
      
      // Mark as completed even on error to avoid infinite loops
      await markProgressCacheMigrationCompleted();
      
      // Continue anyway
      setTimeout(() => {
        onComplete();
      }, 3000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        
        <Text style={styles.title}>{status}</Text>
        
        {details && <Text style={styles.details}>{details}</Text>}
        
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
        
        <Text style={styles.subtitle}>Please wait...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    maxWidth: 400,
  },
  title: {
    fontSize: typography['2xl'],
    fontWeight: typography.semibold,
    color: colors.text,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  details: {
    fontSize: typography.base,
    color: colors.textLight,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textLight,
    marginTop: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.error || colors.textLight,
    textAlign: 'center',
  },
});

