import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, borderRadius, shadows, fonts, type ThemeColors } from '../../constants/theme';

/**
 * Props for SelectedCardBar component
 */
export interface SelectedCardBarProps {
  /** Name of the selected card */
  cardName: string;
  /** Page number where the card is from (for cross-page reference) */
  sourcePage?: number;
  /** Called when Cancel button is pressed (deselects card) */
  onCancel: () => void;
  /** Called when Replace button is pressed (opens card picker to swap this card) */
  onReplace: () => void;
  /** Called when Remove button is pressed (sends to trash) */
  onRemove: () => void;
}

/**
 * SelectedCardBar is a sticky bar that appears when a card is selected.
 * 
 * Features:
 * - Shows selected card name and source page
 * - Persists when navigating between pages (cross-page selection)
 * - Cancel button to deselect
 * - Remove button to send card to trash
 * 
 * Layout:
 * Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
 * Ã¢â€â€š Ã°Å¸Æ’Â Charizard #6 (Page 1)   [Replace] [Remove] [Cancel]   Ã¢â€â€š
 * Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
 */
export function SelectedCardBar({
  cardName,
  sourcePage,
  onCancel,
  onReplace,
  onRemove,
}: SelectedCardBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      {/* Card info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardIcon}>Ã°Å¸Æ’Â</Text>
        <View style={styles.textContainer}>
          <Text style={styles.cardName} numberOfLines={1}>
            {cardName}
          </Text>
          {sourcePage !== undefined && (
            <Text style={styles.sourcePage}>from Page {sourcePage}</Text>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.replaceButton]}
          onPress={onReplace}
          activeOpacity={0.7}
          accessibilityLabel="Replace card with a different one"
        >
          <Text style={styles.replaceButtonText}>Replace</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.removeButton]}
          onPress={onRemove}
          activeOpacity={0.7}
          accessibilityLabel="Remove card from binder"
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          activeOpacity={0.7}
          accessibilityLabel="Cancel selection"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  cardName: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
  sourcePage: {
    fontSize: typography.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  replaceButton: {
    backgroundColor: '#FF9800',
  },
  replaceButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.onPrimary,
  },
  removeButton: {
    backgroundColor: colors.error,
  },
  removeButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.onPrimary,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.onPrimary,
  },
});

export default SelectedCardBar;
