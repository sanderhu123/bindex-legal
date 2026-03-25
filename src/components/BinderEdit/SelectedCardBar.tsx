import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, borderRadius, fonts, type ThemeColors } from '../../constants/theme';

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
  const [replaceStartX, setReplaceStartX] = useState(0);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleReplaceLayout = (event: LayoutChangeEvent) => {
    const nextX = Math.round(event.nativeEvent.layout.x);
    if (nextX !== replaceStartX) {
      setReplaceStartX(nextX);
    }
  };

  return (
    <View style={styles.container}>
      {/* Card info */}
      <View style={[styles.cardInfo, { paddingLeft: replaceStartX }]}>
        <Text style={styles.cardName} numberOfLines={1}>
          {cardName}
          {sourcePage !== undefined && (
            <Text style={styles.sourcePage}> from Page {sourcePage}</Text>
          )}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.replaceButton]}
          onPress={onReplace}
          activeOpacity={0.7}
          accessibilityLabel="Replace card with a different one"
          onLayout={handleReplaceLayout}
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
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xs,
  },
  cardName: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
    flex: 1,
  },
  sourcePage: {
    fontSize: typography.base,
    color: colors.onPrimary + 'D9',
    fontFamily: fonts.regular,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  replaceButton: {
    backgroundColor: colors.warning,
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
    backgroundColor: colors.onPrimary + '33',
  },
  cancelButtonText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.onPrimary,
  },
});

export default SelectedCardBar;
