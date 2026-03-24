import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, borderRadius, type ThemeColors } from '../../constants/theme';

type ButtonSize = 'small' | 'medium' | 'large';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  size = 'medium',
  style,
  textStyle,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.base, styles[size], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.onPrimary} />
      ) : (
        <Text style={[styles.text, styles[`${size}Text`], textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    small: {
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      minHeight: 32,
    },
    medium: {
      paddingVertical: spacing.sm + 4,
      paddingHorizontal: spacing.lg,
      minHeight: 44,
    },
    large: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      minHeight: 52,
    },
    text: {
      color: colors.onPrimary,
      fontFamily: fonts.semibold,
    },
    smallText: {
      fontSize: typography.sm,
    },
    mediumText: {
      fontSize: typography.base,
    },
    largeText: {
      fontSize: typography.lg,
    },
  });
