import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RevenueCatUI from 'react-native-purchases-ui';
import type { CustomerInfo } from 'react-native-purchases';
import { colors, spacing, typography, screenPadding } from '../../constants/theme';

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const [purchased, setPurchased] = useState(false);

  if (purchased) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>You're Now Pro!</Text>
          <Text style={styles.successMessage}>
            You now have unlimited binders. Enjoy tracking your collection!
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.paywallContainer}>
      <RevenueCatUI.Paywall
        onPurchaseCompleted={({ customerInfo }: { customerInfo: CustomerInfo }) => {
          console.log('[Upgrade] Purchase completed:', customerInfo.entitlements.active);
          setPurchased(true);
        }}
        onRestoreCompleted={({ customerInfo }: { customerInfo: CustomerInfo }) => {
          const hasBindexPro = customerInfo.entitlements.active['Bindex Pro'] !== undefined;
          if (hasBindexPro) {
            setPurchased(true);
          } else {
            Alert.alert('No Purchases Found', 'We could not find a previous Bindex Pro purchase for this account.');
          }
        }}
        onDismiss={() => {
          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  paywallContainer: {
    flex: 1,
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
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  doneButtonText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});
