import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, borderRadius, fonts, type ThemeColors } from '../../constants/theme';

interface EmptyCardSlotProps {
  /** Position/slot number in the grid (0-based) */
  position: number;
  /** Width of the card slot (should match CardItem width) */
  width?: number;
  /** Callback when the slot is tapped (optional — no tap handler = non-interactive) */
  onPress?: (position: number) => void;
  /** Custom label text (default: "Add Card" if tappable, "Empty" if not) */
  label?: string;
  /** Whether to hide the slot number (default: false) */
  hideSlotNumber?: boolean;
}

/**
 * Empty card slot component for binder grids.
 * When onPress is provided, renders as a tappable slot with "+" icon.
 * When onPress is omitted, renders as a non-interactive empty placeholder.
 */
export default function EmptyCardSlot({ 
  position, 
  width, 
  onPress,
  label,
  hideSlotNumber = false,
}: EmptyCardSlotProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardSlotStyle = width 
    ? [styles.cardSlot, { width }]
    : styles.cardSlot;

  const imageHeight = width ? width / 0.716 : undefined;
  const imageContainerStyle = imageHeight 
    ? [styles.imageContainer, { height: imageHeight }]
    : styles.imageContainer;

  const displayLabel = label ?? (onPress ? 'Add Card' : 'Empty');

  const content = (
    <>
      <View style={imageContainerStyle}>
        <View style={styles.slotContent}>
          {onPress && <Text style={styles.plusIcon}>+</Text>}
          <Text style={styles.addCardText}>{displayLabel}</Text>
        </View>
      </View>
      {!hideSlotNumber && (
        <View style={styles.slotInfo}>
          <Text style={styles.slotNumber}>Slot {position + 1}</Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardSlotStyle}
        onPress={() => onPress(position)}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardSlotStyle}>{content}</View>;
}

const CARD_MARGIN = 2;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  cardSlot: {
    margin: CARD_MARGIN,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 0.716, // Match Pokemon card aspect ratio (245×342 pixels)
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
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  addCardText: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
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

