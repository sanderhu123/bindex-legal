import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RevenueCatUI from 'react-native-purchases-ui';
import type { CustomerInfo } from 'react-native-purchases';
import { syncProStatusToSupabase } from '../../services/pro/proService';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [purchased, setPurchased] = useState(false);

  if (purchased) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Image
            source={require('../../../assets/logo-icon-teal.png')}
            style={styles.successLogo}
            resizeMode="contain"
          />
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
          syncProStatusToSupabase().catch((err) =>
            console.warn('[Upgrade] Failed to sync pro status:', err)
          );
          setPurchased(true);
        }}
        onRestoreCompleted={({ customerInfo }: { customerInfo: CustomerInfo }) => {
          const hasBindexPro = customerInfo.entitlements.active['Bindex Pro'] !== undefined;
          if (hasBindexPro) {
            syncProStatusToSupabase().catch((err) =>
              console.warn('[Upgrade] Failed to sync pro status:', err)
            );
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  successLogo: {
    width: 64,
    height: 64,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography['3xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  successMessage: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  doneButtonText: {
    color: colors.onPrimary,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
});
