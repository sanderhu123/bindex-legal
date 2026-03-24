import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, type ThemeColors } from '../../constants/theme';

type ButtonSize = 'small' | 'medium' | 'large';

interface TextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  size?: ButtonSize;
  destructive?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export default function TextButton({
  title,
  onPress,
  disabled = false,
  size = 'medium',
  destructive = false,
  style,
  textStyle,
  accessibilityLabel,
}: TextButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const textColor = destructive ? colors.error : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.base, styles[size], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.text, styles[`${size}Text`], { color: textColor }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    small: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      minHeight: 28,
    },
    medium: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 36,
    },
    large: {
      paddingVertical: spacing.sm + 4,
      paddingHorizontal: spacing.lg,
      minHeight: 44,
    },
    text: {
      fontFamily: fonts.medium,
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
