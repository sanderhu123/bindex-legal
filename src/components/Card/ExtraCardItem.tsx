import React, { useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Image } from 'react-native';
import type { Card } from '../../types';
import { colors, spacing, typography, borderRadius, shadows, fonts } from '../../constants/theme';

/**
 * Card with ownership status for extra cards
 */
interface ExtraCard extends Card {
  isOwned: boolean;
}

/**
 * Props for ExtraCardItem component
 */
interface ExtraCardItemProps {
  /** The extra card to display */
  card: ExtraCard;
  /** Width of the card */
  width: number;
  /** Callback when ownership is toggled */
  onToggleOwnership: (card: ExtraCard) => void;
  /** Callback when card is removed */
  onRemove: (card: ExtraCard) => void;
  /** Callback when card is tapped (for viewing details) */
  onPress?: (card: ExtraCard) => void;
}

/**
 * Component to display an extra card in a Master Set binder.
 * 
 * Extra cards are cards not officially part of the set but added by the user
 * (e.g., promo cards, cards from other sets).
 * 
 * Features:
 * - Visual "EXTRA" badge to distinguish from regular cards
 * - Tap to view details
 * - Long-press for remove option
 * - Ownership toggle checkbox
 * - Semi-transparent when missing (not owned)
 * 
 * @example
 * <ExtraCardItem
 *   card={extraCard}
 *   width={100}
 *   onToggleOwnership={handleToggle}
 *   onRemove={handleRemove}
 * />
 */
export default function ExtraCardItem({
  card,
  width,
  onToggleOwnership,
  onRemove,
  onPress,
}: ExtraCardItemProps) {
  // Calculate image height to maintain card aspect ratio (cards are ~1.4:1)
  const imageHeight = width * 1.4;

  /**
   * Handle card tap
   */
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(card);
    }
  }, [card, onPress]);

  /**
   * Handle long press - show remove option
   */
  const handleLongPress = useCallback(() => {
    Alert.alert(
      'Remove Extra Card',
      `Remove "${card.name}" from this binder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(card),
        },
      ]
    );
  }, [card, onRemove]);

  /**
   * Handle ownership toggle
   */
  const handleToggleOwnership = useCallback(() => {
    onToggleOwnership(card);
  }, [card, onToggleOwnership]);

  return (
    <View style={[styles.container, { width }]}>
      <TouchableOpacity
        style={[
          styles.cardContainer,
          !card.isOwned && styles.missingCard,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        delayLongPress={500}
      >
        {/* Extra badge */}
        <View style={styles.extraBadge}>
          <Text style={styles.extraBadgeText}>EXTRA</Text>
        </View>

        {/* Card image */}
        <Image
          source={{ uri: card.imageUrl }}
          style={[
            styles.cardImage,
            { width: width - 4, height: imageHeight - 4 },
          ]}
          resizeMode="contain"
        />

        {/* Ownership checkbox */}
        <TouchableOpacity
          style={styles.checkbox}
          onPress={handleToggleOwnership}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[
            styles.checkboxInner,
            card.isOwned && styles.checkboxChecked,
          ]}>
            {card.isOwned && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Card info */}
      <View style={styles.infoContainer}>
        <Text style={styles.cardName} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.cardNumber} numberOfLines={1}>
          {card.number}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 2,
  },
  cardContainer: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.warning, // Gold/yellow border for extra cards
    position: 'relative',
    ...shadows.sm,
  },
  missingCard: {
    opacity: 0.5,
  },
  cardImage: {
    backgroundColor: colors.backgroundLight,
  },
  extraBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    zIndex: 10,
    ...shadows.sm,
  },
  extraBadgeText: {
    color: colors.text,
    fontSize: typography.xs - 1,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  checkbox: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    zIndex: 10,
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.background,
    fontSize: typography.sm,
    fontFamily: fonts.bold,
  },
  infoContainer: {
    paddingTop: spacing.xs,
    paddingHorizontal: 2,
  },
  cardName: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.text,
    textAlign: 'center',
  },
  cardNumber: {
    fontSize: typography.xs - 1,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

