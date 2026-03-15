import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
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
    color: colors.onPrimary,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
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
    fontFamily: fonts.medium,
  },
});

