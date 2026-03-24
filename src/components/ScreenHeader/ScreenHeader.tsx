import React, { useMemo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, type ThemeColors } from '../../constants/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  rightLabel?: string;
  rightLoading?: boolean;
  rightDisabled?: boolean;
  onRight?: () => void;
}

export default function ScreenHeader({
  title,
  onBack,
  rightAction,
  rightLabel,
  rightLoading,
  rightDisabled,
  onRight,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {rightAction ? (
        rightAction
      ) : rightLabel && onRight ? (
        <TouchableOpacity
          style={styles.rightButton}
          onPress={onRight}
          disabled={rightDisabled || rightLoading}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
        >
          {rightLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.rightText, rightDisabled && styles.rightDisabled]}>
              {rightLabel}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: spacing.xs,
      marginRight: spacing.sm,
      minWidth: 32,
    },
    title: {
      flex: 1,
      fontSize: typography.lg,
      fontFamily: fonts.semibold,
      color: colors.text,
      textAlign: 'center',
    },
    spacer: {
      minWidth: 32,
    },
    rightButton: {
      padding: spacing.xs,
      marginLeft: spacing.sm,
      minWidth: 32,
      alignItems: 'flex-end',
    },
    rightText: {
      fontSize: typography.base,
      fontFamily: fonts.semibold,
      color: colors.primary,
    },
    rightDisabled: {
      opacity: 0.5,
    },
  });
