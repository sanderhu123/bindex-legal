import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

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
 * ┌────────────────────────────────────────────────────────────┐
 * │ 🃏 Charizard #6 (Page 1)   [Replace] [Remove] [Cancel]   │
 * └────────────────────────────────────────────────────────────┘
 */
export function SelectedCardBar({
  cardName,
  sourcePage,
  onCancel,
  onReplace,
  onRemove,
}: SelectedCardBarProps) {
  return (
    <View style={styles.container}>
      {/* Card info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardIcon}>🃏</Text>
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

const styles = StyleSheet.create({
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
    fontWeight: typography.semibold,
    color: colors.background,
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
    fontWeight: typography.medium,
    color: colors.background,
  },
  removeButton: {
    backgroundColor: colors.error,
  },
  removeButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.background,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.background,
  },
});

export default SelectedCardBar;
