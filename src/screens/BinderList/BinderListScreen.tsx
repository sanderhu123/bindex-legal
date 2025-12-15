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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from '../../services/supabase/auth';
import { getBinders, deleteBinder } from '../../services/supabase/binders';
import type { Binder } from '../../types';
import BinderCard from '../../components/Binder/BinderCard';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import EmptyState from '../../components/EmptyState/EmptyState';
import { colors, spacing, typography, borderRadius, screenPadding } from '../../constants/theme';

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

  const loadBinders = async () => {
    try {
      const fetchedBinders = await getBinders();
      
      // Calculate progress from cached values (instant!)
      const bindersWithProgress = fetchedBinders.map((binder) => {
        // Progress is calculated from cached totalCards and ownedCards
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

  // Refresh binders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBinders();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadBinders();
  };

  const handleBinderPress = (binderId: string) => {
    navigation.navigate('BinderDetail', { binderId });
  };

  const handleCreateBinder = () => {
    navigation.navigate('Questionnaire');
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

  const handleDeleteBinder = (binder: Binder) => {
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
              await deleteBinder(binder.id);
              // Refresh binders list
              await loadBinders();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete binder. Please try again.');
            }
          },
        },
      ]
    );
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
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Binders</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <LoadingScreen message="Loading binders..." fullScreen={false} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Binders</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.fixButton} onPress={handleFixBinders}>
            <Text style={styles.fixButtonText}>🔧 Fix</Text>
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
    </View>
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



