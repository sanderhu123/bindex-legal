import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Full-screen loading component
 * Use for initial screen loads (e.g., loading binder, loading cards)
 */
export default function LoadingScreen({
  message = 'Loading...',
  fullScreen = true,
}: LoadingScreenProps) {
  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

