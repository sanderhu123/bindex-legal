import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBinders, deleteBinder } from '../../services/supabase/binders';
import { processToggleQueue, processPendingCountSyncs } from '../../services/offlineQueue';
import { canCreateBinder, canDeleteBinder, recordDeletionUsed, getBinderUsage, presentProPaywall, isUserPro } from '../../services/pro/proService';
import type { Binder } from '../../types';
import BinderCard from '../../components/Binder/BinderCard';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, borderRadius, screenPadding, shadows, type ThemeColors } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { warningVibration } from '../../utils/haptics';
import { Ionicons } from '@expo/vector-icons';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'BinderList'>;

interface BinderWithProgress extends Binder {
  progress: number;
  totalCards: number;
}

export default function BinderListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [binders, setBinders] = useState<BinderWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const greeting = getGreeting();
  const displayName = user?.displayName || user?.email?.split('@')[0];

  const totalOwned = useMemo(() => binders.reduce((sum, b) => sum + b.ownedCards, 0), [binders]);
  const totalCards = useMemo(() => binders.reduce((sum, b) => sum + b.totalCards, 0), [binders]);
  const overallPercent = totalCards > 0 ? Math.round((totalOwned / totalCards) * 100) : 0;

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
      icon={
        <Image
          source={require('../../../assets/logo-icon-teal.png')}
          style={{ width: 64, height: 64, opacity: 0.3 }}
          resizeMode="contain"
        />
      }
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={isDark ? ['#0A3D34', '#0E5A4E', '#126D5F'] : ['#0E5A4E', '#126D5F', '#1A8F7D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + spacing.md }]}
        >
          <View style={styles.headerTopRow}>
            <Image
              source={require('../../../assets/logo-wordmark-white.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>
        <LoadingScreen message="Loading binders..." fullScreen={false} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#0A3D34', '#0E5A4E', '#126D5F'] : ['#0E5A4E', '#126D5F', '#1A8F7D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.headerTopRow}>
          <Image
            source={require('../../../assets/logo-wordmark-white.png')}
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
              <Ionicons
                name={isPro ? 'star' : 'star-outline'}
                size={12}
                color={isPro ? '#FFFFFF' : '#FFD700'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.proBadgeText, isPro && styles.proBadgeTextActive]}>
                Pro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.greeting}>
          {greeting}{displayName ? `, ${displayName}` : ''}!
        </Text>

        {binders.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalOwned}</Text>
              <Text style={styles.statLabel}>cards</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{binders.length}</Text>
              <Text style={styles.statLabel}>{binders.length === 1 ? 'binder' : 'binders'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{overallPercent}%</Text>
              <Text style={styles.statLabel}>complete</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={binders}
        renderItem={renderBinderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={binders.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListHeaderComponent={null}
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

      <TouchableOpacity style={styles.fab} onPress={handleCreateBinder} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLogo: {
    height: 36,
    width: 150,
    marginLeft: -14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  proBadgeActive: {
    backgroundColor: '#DAA520',
    borderColor: '#DAA520',
  },
  proBadgeText: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: '#FFD700',
  },
  proBadgeTextActive: {
    color: '#FFFFFF',
  },
  settingsButton: {
    padding: spacing.xs + 2,
  },
  greeting: {
    fontSize: typography.xl,
    fontFamily: fonts.semibold,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
});
