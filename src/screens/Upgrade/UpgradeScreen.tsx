import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius, screenPadding, shadows } from '../../constants/theme';
import { purchasePro, restorePurchases, getProPrice } from '../../services/pro/proService';

type PurchaseState = 'idle' | 'loading' | 'purchasing' | 'restoring' | 'success' | 'error';

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const [state, setState] = useState<PurchaseState>('loading');
  const [priceString, setPriceString] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadPrice();
  }, []);

  const loadPrice = async () => {
    try {
      const price = await getProPrice();
      setPriceString(price);
      setState('idle');
    } catch {
      setPriceString(null);
      setState('idle');
    }
  };

  const handlePurchase = async () => {
    setState('purchasing');
    setErrorMessage('');

    try {
      const success = await purchasePro();
      if (success) {
        setState('success');
      } else {
        setState('idle');
      }
    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || 'Purchase failed. Please try again.');
    }
  };

  const handleRestore = async () => {
    setState('restoring');
    setErrorMessage('');

    try {
      const restored = await restorePurchases();
      if (restored) {
        setState('success');
      } else {
        setState('idle');
        Alert.alert('No Purchases Found', 'We could not find a previous Pro purchase for this account.');
      }
    } catch (error: any) {
      setState('idle');
      Alert.alert('Restore Failed', error.message || 'Could not restore purchases. Please try again.');
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (state === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>You're Now Pro!</Text>
          <Text style={styles.successMessage}>
            You now have unlimited binders. Enjoy tracking your collection!
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isWorking = state === 'purchasing' || state === 'restoring' || state === 'loading';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>One-time purchase. Yours forever.</Text>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <BenefitRow text="Unlimited binders" />
          <BenefitRow text="Delete & recreate freely" />
          <BenefitRow text="All features included" />
          <BenefitRow text="One-time purchase" />
          <BenefitRow text="No subscription" />
        </View>

        {/* Price + Buy button */}
        <TouchableOpacity
          style={[styles.buyButton, isWorking && styles.buyButtonDisabled]}
          onPress={handlePurchase}
          disabled={isWorking}
        >
          {state === 'purchasing' ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Text style={styles.buyButtonText}>
                Buy Pro {priceString ? `— ${priceString}` : ''}
              </Text>
              <Text style={styles.buyButtonSubtext}>one-time, forever yours</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Error message */}
        {state === 'error' && errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {/* Restore */}
        <View style={styles.restoreSection}>
          <Text style={styles.restoreLabel}>Already purchased?</Text>
          <TouchableOpacity onPress={handleRestore} disabled={isWorking}>
            {state === 'restoring' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.restoreButton}>Restore Purchase</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitCheck}>✓</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.base,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography['4xl'],
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  benefitsCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  benefitCheck: {
    fontSize: typography.lg,
    color: colors.success,
    fontWeight: typography.bold,
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.medium,
  },
  buyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: colors.background,
    fontSize: typography.lg,
    fontWeight: typography.bold,
  },
  buyButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: typography.sm,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  restoreSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  restoreLabel: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  restoreButton: {
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
  },
  successIcon: {
    fontSize: 64,
    color: colors.success,
    fontWeight: typography.bold,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  successMessage: {
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  doneButtonText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});
