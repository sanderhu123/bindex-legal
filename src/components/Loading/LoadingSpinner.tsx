import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, type ThemeColors } from '../../constants/theme';

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
  color: colorProp,
  message,
  style,
}: LoadingSpinnerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = colorProp ?? colors.primary;
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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

