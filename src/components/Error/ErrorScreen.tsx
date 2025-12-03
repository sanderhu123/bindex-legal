import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  retryLabel?: string;
  goBackLabel?: string;
}

/**
 * Full-screen error component
 * Use for critical errors that prevent the screen from loading
 */
export default function ErrorScreen({
  title = 'Something went wrong',
  message,
  onRetry,
  onGoBack,
  retryLabel = 'Try Again',
  goBackLabel = 'Go Back',
}: ErrorScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.buttonContainer}>
        {onRetry && (
          <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
        {onGoBack && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onGoBack}>
            <Text style={styles.secondaryButtonText}>{goBackLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
});

