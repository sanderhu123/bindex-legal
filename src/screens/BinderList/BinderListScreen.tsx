import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from '../../services/supabase/auth';
import { getBinders, deleteBinder } from '../../services/supabase/binders';
import { processToggleQueue, processPendingCountSyncs } from '../../services/offlineQueue';
import { canCreateBinder, canDeleteBinder, recordDeletionUsed, getBinderUsage, presentProPaywall, isUserPro } from '../../services/pro/proService';
import type { Binder } from '../../types';
import BinderCard from '../../components/Binder/BinderCard';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import EmptyState from '../../components/EmptyState/EmptyState';
import { colors, spacing, typography, borderRadius, screenPadding } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { warningVibration } from '../../utils/haptics';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'BinderList'>;

interface BinderWithProgress extends Binder {
  progress: number;
  totalCards: number;
}

export default function BinderListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [binders, setBinders] = useState<BinderWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const loadBinders = async () => {
    try {
      const fetchedBinders = await getBinders();
      
      const bindersWithProgress = fetchedBinders.map((binder) => {
        const progress = binder.totalCards > 0 
          ? Math.round((binder.ownedCards / binder.totalCards) * 100)
          : 0;
        
        return { 
          ...binder, 
          progress, 
          totalCards: binder.totalCards 
        };
      });

      setBinders(bindersWithProgress);

      // Check Pro status (non-blocking)
      isUserPro().then(setIsPro).catch(() => {});
    } catch (error: any) {
      console.error('Error loading binders:', error);
      Alert.alert('Error', error.message || 'Failed to load binders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBinders();
  }, []);

  // Silently re-fetch binder data without showing errors or loading states
  const silentRefresh = useCallback(async () => {
    try {
      const fetchedBinders = await getBinders();
      const bindersWithProgress = fetchedBinders.map((binder) => {
        const progress = binder.totalCards > 0
          ? Math.round((binder.ownedCards / binder.totalCards) * 100)
          : 0;
        return { ...binder, progress, totalCards: binder.totalCards };
      });
      setBinders(bindersWithProgress);
    } catch {
      // Silent — don't show alerts for background refresh
    }
  }, []);

  // Refresh binders when screen comes into focus.
  // First process any queued offline toggles and pending count syncs
  // so the progress numbers are accurate before we load.
  useFocusEffect(
    useCallback(() => {
      processToggleQueue()
        .then(() => processPendingCountSyncs())
        .catch(() => {})
        .finally(() => loadBinders());
      return () => {};
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadBinders();
  };

  const handleBinderPress = (binderId: string) => {
    navigation.navigate('BinderDetail', { binderId });
  };

  const handleCreateBinder = async () => {
    try {
      const allowed = await canCreateBinder();
      if (!allowed) {
        Alert.alert(
          'Upgrade to Bindex Pro',
          'Free accounts can create 1 binder. Upgrade to Pro for unlimited binders!',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Upgrade to Pro',
              onPress: async () => {
                const purchased = await presentProPaywall();
                if (purchased) {
                  navigation.navigate('Questionnaire');
                }
              },
            },
          ]
        );
        return;
      }
      navigation.navigate('Questionnaire');
    } catch {
      navigation.navigate('Questionnaire');
    }
  };

  const handleFixBinders = async () => {
    Alert.alert(
      'Recalculate Card Counts',
      'This will recalculate the total card count for all your binders. Use this if you see "0 / 0 cards". Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Now',
          onPress: async () => {
            try {
              // Import dynamically to avoid loading unless needed
              const { fixExistingBinders } = await import('../../utils/fixExistingBinders');
              
              setLoading(true);
              const result = await fixExistingBinders();
              setLoading(false);
              
              if (result.success) {
                Alert.alert(
                  'Success!',
                  `Fixed ${result.fixed} binder${result.fixed !== 1 ? 's' : ''} successfully! Refreshing...`,
                  [{ text: 'OK', onPress: () => loadBinders() }]
                );
              } else {
                Alert.alert(
                  'Completed',
                  `Fixed ${result.fixed} binder${result.fixed !== 1 ? 's' : ''}. ${result.errors} had errors.`,
                  [{ text: 'OK', onPress: () => loadBinders() }]
                );
              }
            } catch (error: any) {
              setLoading(false);
              Alert.alert('Error', error.message || 'Failed to fix binders');
            }
          },
        },
      ]
    );
  };

  const handleDeleteBinder = async (binder: Binder) => {
    try {
      const usage = await getBinderUsage();

      // Pro users get normal delete confirmation
      if (usage.tier === 'pro') {
        Alert.alert(
          'Delete Binder',
          `Are you sure you want to delete "${binder.name}"? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  warningVibration();
                  await deleteBinder(binder.id);
                  showSuccess('Binder deleted');
                  await loadBinders();
                } catch (error: any) {
                  showError('Failed to delete binder', error.message);
                }
              },
            },
          ]
        );
        return;
      }

      // Free user — check if they can still delete
      if (!usage.canDelete) {
        Alert.alert(
          'Upgrade to Bindex Pro',
          "You've used your free do-over. Upgrade to Pro to manage your binders freely.",
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Upgrade to Pro',
              onPress: () => presentProPaywall(),
            },
          ]
        );
        return;
      }

      // Free user with do-over available — show warning
      Alert.alert(
        'Use Your Do-Over?',
        `This is your only free do-over. After deleting "${binder.name}", you won't be able to delete binders again unless you upgrade to Pro.\n\nAre you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete (Use Do-Over)',
            style: 'destructive',
            onPress: async () => {
              try {
                warningVibration();
                await deleteBinder(binder.id);
                await recordDeletionUsed();
                showSuccess('Binder deleted');
                await loadBinders();
              } catch (error: any) {
                showError('Failed to delete binder', error.message);
              }
            },
          },
        ]
      );
    } catch {
      // Fallback: allow delete with standard confirmation
      Alert.alert(
        'Delete Binder',
        `Are you sure you want to delete "${binder.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                warningVibration();
                await deleteBinder(binder.id);
                showSuccess('Binder deleted');
                await loadBinders();
              } catch (error: any) {
                showError('Failed to delete binder', error.message);
              }
            },
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // AuthContext will detect the change and return user to the login screen
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderBinderCard = ({ item }: { item: BinderWithProgress }) => (
    <BinderCard
      binder={item}
      completionPercentage={item.progress}
      totalCards={item.totalCards}
      onPress={() => handleBinderPress(item.id)}
      onDelete={() => handleDeleteBinder(item)}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      title="No Binders Yet"
      message="Create your first binder to start tracking your Pokémon card collection!"
      actionLabel="Create Binder"
      onAction={handleCreateBinder}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Binders</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <LoadingScreen message="Loading binders..." fullScreen={false} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Binders</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.fixButton} 
            onPress={() => navigation.navigate('CardSearchTest')}
          >
            <Text style={styles.fixButtonText}>🔍 Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fixButton} onPress={handleFixBinders}>
            <Text style={styles.fixButtonText}>🔧 Fix</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.proButton, isPro && styles.proButtonActive]}
            onPress={() => {
              if (isPro) {
                Alert.alert('Bindex Pro', 'You have Bindex Pro! Unlimited binders are unlocked.');
              } else {
                navigation.navigate('Upgrade');
              }
            }}
          >
            <Text style={styles.proButtonText}>{isPro ? 'Pro ✓' : 'Pro'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={binders}
        renderItem={renderBinderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={binders.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateBinder}>
          <Text style={styles.createButtonText}>Create New Binder</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    paddingTop: screenPadding,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fixButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  fixButtonText: {
    color: colors.background,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  proButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.sm,
  },
  proButtonActive: {
    backgroundColor: colors.success,
  },
  proButtonText: {
    color: colors.background,
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  listContainer: {
    padding: screenPadding,
  },
  emptyListContainer: {
    flex: 1,
  },
  footer: {
    padding: screenPadding,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});



