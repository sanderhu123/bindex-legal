import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  style?: any;
}

/**
 * Standardized loading spinner component
 * Use for inline loading states (e.g., loading cards in a list)
 */
export default function LoadingSpinner({
  size = 'small',
  color = colors.primary,
  message,
  style,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  message: {
    marginTop: spacing.sm,
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

