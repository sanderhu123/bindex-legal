import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface EmptyCardSlotProps {
  /** Position/slot number in the grid (0-based) */
  position: number;
  /** Width of the card slot (should match CardItem width) */
  width?: number;
  /** Callback when the slot is tapped */
  onPress: (position: number) => void;
}

/**
 * Empty card slot component for Custom binders
 * 
 * Shows a "+" icon with "Add Card" text below.
 * Used to represent empty positions in the card grid.
 * Tapping opens the card picker to add a card at this position.
 */
export default function EmptyCardSlot({ position, width, onPress }: EmptyCardSlotProps) {
  const handlePress = () => {
    onPress(position);
  };

  const cardSlotStyle = width 
    ? [styles.cardSlot, { width }]
    : styles.cardSlot;

  // Calculate image container height based on width and aspect ratio (0.7)
  const imageHeight = width ? width / 0.7 : undefined;
  const imageContainerStyle = imageHeight 
    ? [styles.imageContainer, { height: imageHeight }]
    : styles.imageContainer;

  return (
    <TouchableOpacity
      style={cardSlotStyle}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={imageContainerStyle}>
        <View style={styles.slotContent}>
          <Text style={styles.plusIcon}>+</Text>
          <Text style={styles.addCardText}>Add Card</Text>
        </View>
      </View>
      {/* Slot number display (like card number) */}
      <View style={styles.slotInfo}>
        <Text style={styles.slotNumber}>Slot {position + 1}</Text>
      </View>
    </TouchableOpacity>
  );
}

const CARD_MARGIN = 2;

const styles = StyleSheet.create({
  cardSlot: {
    margin: CARD_MARGIN,
    marginBottom: 8,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.7, // Match Pokemon card aspect ratio
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  slotContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  plusIcon: {
    fontSize: 36,
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  addCardText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  slotInfo: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    alignItems: 'flex-start',
  },
  slotNumber: {
    fontSize: typography.xs,
    color: colors.textLight,
  },
});

