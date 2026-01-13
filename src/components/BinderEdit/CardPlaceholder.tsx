import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import CardImage from '../Card/CardImage';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

/**
 * Card info for placeholder tray
 */
export interface PlaceholderCard {
  cardId: string;
  imageUrl?: string;
  cardName?: string;
}

/**
 * Props for CardPlaceholder component
 */
export interface CardPlaceholderProps {
  /** Cards currently in the placeholder tray */
  cards: PlaceholderCard[];
  /** Maximum number of cards allowed (default 18) */
  maxCards?: number;
  /** Index of currently selected card in placeholder (-1 if none) */
  selectedIndex: number;
  /** Called when a card in the placeholder is tapped */
  onCardPress: (index: number, cardId: string) => void;
  /** Called when trash zone is tapped (only when card is selected) */
  onTrashPress?: () => void;
  /** Whether a card is currently selected (enables trash zone) */
  hasSelectedCard: boolean;
}

/**
 * CardPlaceholder is the bottom tray in binder edit mode.
 * 
 * Features:
 * - Horizontal scrolling list of cards temporarily removed from binder
 * - Maximum 18 cards
 * - Trash zone on the right (visible when card is selected)
 * - Cards can be dragged back to binder
 * 
 * Layout:
 * ├═══════════════════════════════════════════════════┤
 * │  📥 CARD PLACEHOLDER                         0/18 │
 * │  ╔════╗  ╔════╗  ╔════╗  ╔════╗      🗑️ TRASH  │
 * │  ║    ║  ║    ║  ║    ║  ║    ║                   │
 * │  ╚════╝  ╚════╝  ╚════╝  ╚════╝                   │
 * └───────────────────────────────────────────────────┘
 */
export function CardPlaceholder({
  cards,
  maxCards = 18,
  selectedIndex,
  onCardPress,
  onTrashPress,
  hasSelectedCard,
}: CardPlaceholderProps) {
  const cardCount = cards.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>📥</Text>
          <Text style={styles.headerTitle}>CARD PLACEHOLDER</Text>
        </View>
        <Text style={styles.headerCount}>
          {cardCount}/{maxCards}
        </Text>
      </View>

      {/* Cards row */}
      <View style={styles.contentRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
          style={styles.cardsScroll}
        >
          {cards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Drag cards here to temporarily remove them
              </Text>
            </View>
          ) : (
            cards.map((card, index) => (
              <TouchableOpacity
                key={`${card.cardId}-${index}`}
                style={[
                  styles.card,
                  selectedIndex === index && styles.cardSelected,
                ]}
                onPress={() => onCardPress(index, card.cardId)}
                activeOpacity={0.7}
                accessibilityLabel={`${card.cardName || 'Card'} in placeholder, tap to select`}
              >
                <CardImage
                  source={card.imageUrl}
                  style={styles.cardImage}
                  cardInfo={{ id: card.cardId, name: card.cardName }}
                />
                {selectedIndex === index && (
                  <View style={styles.selectedOverlay}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Trash Zone - only visible when a card is selected */}
        {hasSelectedCard && (
          <TouchableOpacity
            style={styles.trashZone}
            onPress={onTrashPress}
            activeOpacity={0.7}
            accessibilityLabel="Trash zone, tap to remove selected card"
          >
            <Text style={styles.trashIcon}>🗑️</Text>
            <Text style={styles.trashText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  headerCount: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textTertiary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardsScroll: {
    flex: 1,
  },
  cardsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 80,
  },
  emptyState: {
    flex: 1,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  card: {
    width: 56,
    height: 78,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    fontSize: 20,
    color: colors.background,
    fontWeight: 'bold',
  },
  trashZone: {
    width: 70,
    height: 78,
    marginRight: spacing.md,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashIcon: {
    fontSize: 24,
  },
  trashText: {
    fontSize: typography.xs,
    color: colors.error,
    fontWeight: typography.medium,
    marginTop: 2,
  },
});

export default CardPlaceholder;
