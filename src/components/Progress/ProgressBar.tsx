import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, typography, borderRadius, type ThemeColors } from '../../constants/theme';

interface ProgressBarProps {
  /** Current value (e.g., owned cards) */
  current: number;
  /** Total value (e.g., total cards) */
  total: number;
  /** Optional: Custom percentage (if not provided, calculated from current/total) */
  percentage?: number;
  /** Display format: 'compact' shows "X cards • Y%", 'full' shows "X / Y cards (Z%)", 'ratio' shows "X / Y cards" */
  format?: 'compact' | 'full' | 'ratio';
  /** Optional: Custom text to display instead of default format */
  customText?: string;
  /** Text size: 'small' (12px) for compact views, 'large' (20px) for prominent displays */
  textSize?: 'small' | 'large';
}

export default function ProgressBar({
  current,
  total,
  percentage,
  format = 'full',
  customText,
  textSize = 'small',
}: ProgressBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progressPercentage = percentage ?? (total > 0 ? Math.round((current / total) * 100) : 0);
  const clampedPercentage = Math.min(100, Math.max(0, Math.round(progressPercentage)));
  const displayPercentage = Math.round(clampedPercentage);

  const animatedWidth = useRef(new Animated.Value(clampedPercentage)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedPercentage,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [clampedPercentage]);

  const getProgressText = (): string => {
    if (customText) {
      return customText;
    }

    if (format === 'compact') {
      return `${current} cards • ${displayPercentage}%`;
    } else if (format === 'ratio') {
      const displayTotal = total > 0 ? total : (displayPercentage > 0 ? Math.round((current / displayPercentage) * 100) : 0);
      return `${current} / ${displayTotal} cards`;
    } else {
      const displayTotal = total > 0 ? total : (displayPercentage > 0 ? Math.round((current / displayPercentage) * 100) : 0);
      return `${current} / ${displayTotal} cards (${displayPercentage}%)`;
    }
  };

  const textStyle = textSize === 'large' ? styles.textLarge : styles.text;

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Text style={textStyle}>{getProgressText()}</Text>
      <View style={styles.barContainer}>
        <Animated.View style={[styles.barFill, { width: widthInterpolation, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginTop: 4,
  },
  text: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: 6,
  },
  textLarge: {
    fontSize: typography.xl,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  barContainer: {
    height: 6,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
