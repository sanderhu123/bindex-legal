import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import CardImage from '../Card/CardImage';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

/**
 * Props for CardSlot component
 */
export interface CardSlotProps {
  /** The card ID in this slot (null if empty) */
  cardId: string | null;
  /** Image URL for the card */
  imageUrl?: string;
  /** Card name for display/accessibility */
  cardName?: string;
  /** Global slot index (0-based) */
  slotIndex: number;
  /** Whether this slot is currently selected */
  isSelected: boolean;
  /** Called when slot is tapped */
  onPress: () => void;
  /** Called when slot is long-pressed (for drag) */
  onLongPress?: () => void;
  /** Layout preference for sizing */
  layoutPreference?: '3x3' | '4x3';
}

/**
 * CardSlot represents a single card position in the binder edit grid.
 * 
 * States:
 * - Empty slot (dashed border, tappable to add card)
 * - Filled slot (shows card image, tappable to select)
 * - Selected slot (highlighted border)
 */
export function CardSlot({
  cardId,
  imageUrl,
  cardName,
  slotIndex,
  isSelected,
  onPress,
  onLongPress,
  layoutPreference = '3x3',
}: CardSlotProps) {
  const isEmpty = !cardId;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        layoutPreference === '4x3' && styles.container4x3,
        isEmpty && styles.emptyContainer,
        isSelected && styles.selectedContainer,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={300}
      accessibilityLabel={
        isEmpty 
          ? `Empty slot ${slotIndex + 1}, tap to add card` 
          : `${cardName || 'Card'} in slot ${slotIndex + 1}${isSelected ? ', selected' : ''}`
      }
      accessibilityRole="button"
    >
      {isEmpty ? (
        <View style={styles.emptyContent}>
          <Text style={styles.plusIcon}>+</Text>
        </View>
      ) : (
        <CardImage
          source={imageUrl}
          style={styles.cardImage}
          cardInfo={{ id: cardId, name: cardName }}
        />
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectionOverlay}>
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 0.7, // Card aspect ratio
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
    ...shadows.sm,
  },
  container4x3: {
    // Slightly smaller margins for 4x3 grid
    margin: 3,
  },
  emptyContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selectedContainer: {
    borderWidth: 3,
    borderStyle: 'solid',
    borderColor: colors.primary,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: 32,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0, // Override CardImage border radius
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CardSlot;
