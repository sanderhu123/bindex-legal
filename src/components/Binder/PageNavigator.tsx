import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onJumpToPage: () => void;
  forceDarkMode?: boolean;
  /** Optional subtitle text (e.g. "Cards 1 - 9 of 234") */
  subtitle?: string;
}

export default function PageNavigator({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onJumpToPage,
  forceDarkMode = false,
  subtitle,
}: PageNavigatorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, forceDarkMode), [colors, forceDarkMode]);

  const isPreviousDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.arrowButton, isPreviousDisabled && styles.arrowButtonDisabled]}
        onPress={onPreviousPage}
        disabled={isPreviousDisabled}
        activeOpacity={0.6}
        accessibilityLabel="Previous page"
        accessibilityRole="button"
        accessibilityState={{ disabled: isPreviousDisabled }}
      >
        <Ionicons
          name="chevron-back"
          size={22}
          color={isPreviousDisabled
            ? (forceDarkMode ? '#575757' : colors.textTertiary)
            : (forceDarkMode ? '#FFFFFF' : colors.primary)}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pageInfo}
        onPress={onJumpToPage}
        activeOpacity={0.6}
        accessibilityLabel={`Page ${currentPage} of ${totalPages}. Tap to jump to a page.`}
        accessibilityRole="button"
      >
        <View style={styles.pageRow}>
          <Text style={styles.pageText}>
            {currentPage} / {totalPages}
          </Text>
          <Ionicons
            name="swap-horizontal"
            size={14}
            color={forceDarkMode ? '#9A9A9A' : colors.textTertiary}
            style={styles.jumpIcon}
          />
        </View>
        {subtitle ? (
          <Text style={styles.subtitleText}>{subtitle}</Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.arrowButton, isNextDisabled && styles.arrowButtonDisabled]}
        onPress={onNextPage}
        disabled={isNextDisabled}
        activeOpacity={0.6}
        accessibilityLabel="Next page"
        accessibilityRole="button"
        accessibilityState={{ disabled: isNextDisabled }}
      >
        <Ionicons
          name="chevron-forward"
          size={22}
          color={isNextDisabled
            ? (forceDarkMode ? '#575757' : colors.textTertiary)
            : (forceDarkMode ? '#FFFFFF' : colors.primary)}
        />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors, forceDarkMode: boolean) => {
  const palette = forceDarkMode
    ? {
        containerBg: '#111111',
        border: '#2D2D2D',
        text: '#FFFFFF',
        subtitle: '#9A9A9A',
      }
    : {
        containerBg: colors.backgroundLight,
        border: colors.border,
        text: colors.text,
        subtitle: colors.textTertiary,
      };

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
    },
    arrowButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.full,
      backgroundColor: palette.containerBg,
      borderWidth: 1,
      borderColor: palette.border,
    },
    arrowButtonDisabled: {
      opacity: 0.35,
    },
    pageInfo: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginHorizontal: spacing.md,
      backgroundColor: palette.containerBg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: palette.border,
    },
    pageRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pageText: {
      fontSize: typography.base,
      fontFamily: fonts.semibold,
      color: palette.text,
      letterSpacing: 1,
    },
    jumpIcon: {
      marginLeft: 6,
    },
    subtitleText: {
      fontSize: typography.xs,
      fontFamily: fonts.regular,
      color: palette.subtitle,
      marginTop: 2,
    },
  });
};
