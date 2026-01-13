import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
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
  const hasImage = imageUrl && imageUrl.trim() !== '';

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
      ) : hasImage ? (
        <View style={styles.imageContainer}>
          <Image
            key={`img-${cardId}-${imageUrl}`}
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            contentFit="contain"
            transition={0}
            cachePolicy="memory-disk"
          />
        </View>
      ) : (
        // Fallback placeholder when no image URL
        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderIcon}>🃏</Text>
          <Text style={styles.placeholderText} numberOfLines={2}>
            {cardName || 'Card'}
          </Text>
        </View>
      )}
      
      {/* Selection indicator - small corner badge instead of overlay */}
      {isSelected && (
        <View style={styles.selectionBadge}>
          <Text style={styles.checkmarkText}>✓</Text>
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
    borderWidth: 4,
    borderStyle: 'solid',
    borderColor: colors.primary,
    // Add glow effect for better visibility
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
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
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a5fb4',
    padding: spacing.xs,
  },
  placeholderIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Selection badge - small corner indicator (no overlay to avoid grey flash)
  selectionBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Add shadow for visibility on light cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  checkmarkText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CardSlot;
