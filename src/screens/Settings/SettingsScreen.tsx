import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/supabase/auth';
import {
  isUserPro,
  presentProPaywall,
  restorePurchases,
  getProPrice,
} from '../../services/pro/proService';
import { clearAllCache, getCacheStatistics } from '../../services/cacheManager';
import { fixExistingBinders } from '../../utils/fixExistingBinders';
import { colors, fonts, spacing, typography, borderRadius, screenPadding, shadows } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [proPrice, setProPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixingBinders, setFixingBinders] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    async function loadData() {
      try {
        const [pro, price] = await Promise.all([
          isUserPro(),
          getProPrice(),
        ]);
        setIsPro(pro);
        setProPrice(price);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const handleUpgrade = async () => {
    const purchased = await presentProPaywall();
    if (purchased) {
      setIsPro(true);
      showSuccess('Welcome to Bindex Pro!');
    }
  };

  const handleRestore = async () => {
    setRestoringPurchases(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        setIsPro(true);
        showSuccess('Purchases restored!');
      } else {
        Alert.alert('No Purchases Found', 'No previous Pro purchases were found for this account.');
      }
    } catch {
      showError('Failed to restore', 'Please try again later.');
    } finally {
      setRestoringPurchases(false);
    }
  };

  const handleFixBinders = () => {
    Alert.alert(
      'Fix Binder Counts',
      'This will recalculate card counts for all your binders. Use this if you see incorrect numbers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Now',
          onPress: async () => {
            setFixingBinders(true);
            try {
              const result = await fixExistingBinders();
              if (result.success) {
                showSuccess(`Fixed ${result.fixed} binder${result.fixed !== 1 ? 's' : ''}`);
              } else {
                Alert.alert('Done', `Fixed ${result.fixed}, ${result.errors} had errors.`);
              }
            } catch (error: any) {
              showError('Failed to fix', error.message);
            } finally {
              setFixingBinders(false);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached card data and images. The app will re-download data as needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              await clearAllCache();
              showSuccess('Cache cleared');
            } catch {
              showError('Failed to clear cache');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const renderRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    options?: {
      value?: string;
      destructive?: boolean;
      loading?: boolean;
      disabled?: boolean;
    }
  ) => (
    <TouchableOpacity
      style={[styles.row, options?.disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={options?.disabled || options?.loading}
      activeOpacity={0.6}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={20}
          color={options?.destructive ? colors.error : colors.textSecondary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, options?.destructive && styles.rowLabelDestructive]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {options?.loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : options?.value ? (
          <Text style={styles.rowValue}>{options.value}</Text>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          {renderRow('mail-outline', 'Email', () => {}, {
            value: user?.email || '—',
          })}
          {renderRow('log-out-outline', 'Logout', handleLogout, {
            destructive: true,
          })}
        </View>

        {/* Subscription Section */}
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.section}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : isPro ? (
            renderRow('checkmark-circle', 'Bindex Pro', () => {
              Alert.alert('Bindex Pro', 'You have Bindex Pro! Unlimited binders are unlocked.');
            }, { value: 'Active' })
          ) : (
            <>
              {renderRow('star-outline', 'Upgrade to Pro', handleUpgrade, {
                value: proPrice || undefined,
              })}
              {renderRow('refresh-outline', 'Restore Purchases', handleRestore, {
                loading: restoringPurchases,
              })}
            </>
          )}
        </View>

        {/* Data Section */}
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.section}>
          {renderRow('build-outline', 'Fix Binder Counts', handleFixBinders, {
            loading: fixingBinders,
          })}
          {renderRow('trash-outline', 'Clear Cache', handleClearCache, {
            loading: clearingCache,
          })}
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          {renderRow('information-circle-outline', 'Version', () => {}, {
            value: appVersion,
          })}
        </View>

        <View style={styles.footer} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: screenPadding,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: screenPadding,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  rowLabelDestructive: {
    color: colors.error,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
  loadingRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  footer: {
    height: spacing.xxl,
  },
});
