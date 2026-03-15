import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
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
import { colors, fonts, spacing, typography, borderRadius, screenPadding, shadows } from '../../constants/theme';
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
      // Silent refresh — no alerts
    }
  }, []);

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

  const handleDeleteBinder = async (binder: Binder) => {
    try {
      const usage = await getBinderUsage();

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
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo-wordmark.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <LoadingScreen message="Loading binders..." fullScreen={false} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo-wordmark.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.proBadge, isPro && styles.proBadgeActive]}
            onPress={() => {
              if (isPro) {
                Alert.alert('Bindex Pro', 'You have Bindex Pro! Unlimited binders are unlocked.');
              } else {
                navigation.navigate('Upgrade');
              }
            }}
          >
            <Text style={[styles.proBadgeText, isPro && styles.proBadgeTextActive]}>
              {isPro ? 'Pro' : 'Pro'}
            </Text>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateBinder} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLogo: {
    height: 36,
    width: 150,
    marginLeft: -6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  proBadgeActive: {
    backgroundColor: colors.primary,
  },
  proBadgeText: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  proBadgeTextActive: {
    color: colors.background,
  },
  logoutButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  logoutText: {
    color: colors.textTertiary,
    fontSize: typography.sm,
    fontFamily: fonts.medium,
  },
  listContainer: {
    padding: screenPadding,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  fabIcon: {
    fontSize: 30,
    lineHeight: 32,
    color: colors.background,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
