import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Inline error banner component
 * Use for non-critical errors that don't block the entire screen
 */
export default function ErrorBanner({
  message,
  onDismiss,
  onRetry,
  retryLabel = 'Retry',
}: ErrorBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.buttonContainer}>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.error + '15', // 15 = ~8% opacity
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.error,
    marginRight: spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  retryButtonText: {
    fontSize: typography.sm,
    color: colors.error,
    fontWeight: typography.semibold,
  },
  dismissButton: {
    padding: spacing.xs,
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: typography.base,
    color: colors.error,
    fontWeight: typography.bold,
  },
});

