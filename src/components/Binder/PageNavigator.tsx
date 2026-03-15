import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, shadows, type ThemeColors } from '../../constants/theme';

/**
 * Props for the PageNavigator component
 */
interface PageNavigatorProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Called when user taps the previous (left) arrow */
  onPreviousPage: () => void;
  /** Called when user taps the next (right) arrow */
  onNextPage: () => void;
  /** Called when user taps the page number (opens jump-to-page modal) */
  onJumpToPage: () => void;
}

/**
 * PageNavigator displays a navigation bar for binder page navigation
 * Shows: [◄] Page X of Y [►]
 * - Left arrow goes to previous page (disabled on page 1)
 * - Right arrow goes to next page (disabled on last page)
 * - Tapping "Page X of Y" opens a modal to jump to a specific page
 */
export default function PageNavigator({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onJumpToPage,
}: PageNavigatorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Determine if arrows should be disabled
  const isPreviousDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <View style={styles.container}>
      {/* Previous page button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          isPreviousDisabled && styles.arrowButtonDisabled,
        ]}
        onPress={onPreviousPage}
        disabled={isPreviousDisabled}
        activeOpacity={0.7}
        accessibilityLabel="Go to previous page"
        accessibilityRole="button"
        accessibilityState={{ disabled: isPreviousDisabled }}
      >
        <Text
          style={[
            styles.arrowText,
            isPreviousDisabled && styles.arrowTextDisabled,
          ]}
        >
          ◄
        </Text>
      </TouchableOpacity>

      {/* Page info - tappable to open jump modal */}
      <TouchableOpacity
        style={styles.pageInfoButton}
        onPress={onJumpToPage}
        activeOpacity={0.7}
        accessibilityLabel={`Page ${currentPage} of ${totalPages}. Tap to jump to a page.`}
        accessibilityRole="button"
      >
        <Text style={styles.pageText}>
          Page {currentPage} of {totalPages}
        </Text>
      </TouchableOpacity>

      {/* Next page button */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          isNextDisabled && styles.arrowButtonDisabled,
        ]}
        onPress={onNextPage}
        disabled={isNextDisabled}
        activeOpacity={0.7}
        accessibilityLabel="Go to next page"
        accessibilityRole="button"
        accessibilityState={{ disabled: isNextDisabled }}
      >
        <Text
          style={[
            styles.arrowText,
            isNextDisabled && styles.arrowTextDisabled,
          ]}
        >
          ►
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  arrowButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: typography.xl,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  arrowTextDisabled: {
    color: colors.textTertiary,
  },
  pageInfoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  pageText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
});
