import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import CardImage from '../Card/CardImage';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import type { Card } from '../../types';
import type { MainStackParamList } from '../../navigation/AppNavigator';

/**
 * Card with ownership status
 */
interface CardWithOwnership extends Card {
  isOwned: boolean;
}

type NavigationProp = StackNavigationProp<MainStackParamList, 'CardDetail'>;

/**
 * Props for the BinderPageView component
 */
interface BinderPageViewProps {
  /** Array of all cards in the binder (sorted) */
  cards: CardWithOwnership[];
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of cards per page (9 for 3×3, 12 for 4×3) */
  cardsPerPage: number;
  /** Number of columns (3 or 4) */
  columns: number;
  /** Width of each card */
  cardWidth: number;
  /** Binder ID for navigation */
  binderId: string;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when checkbox is tapped (for toggling ownership) */
  onCardPress: (card: CardWithOwnership) => void;
  /** Callback when an empty slot is tapped (for Custom binders) */
  onEmptySlotPress?: (slotIndex: number) => void;
  /** Whether this is a Custom binder (shows empty slots) */
  isCustomMode?: boolean;
  /** Collection mode of the binder */
  collectionMode?: 'master-set' | 'region' | 'custom';
  /** Step 34A: Callback when card is long-pressed (for enlarge preview) */
  onCardLongPress?: (card: CardWithOwnership) => void;
  /** Step 34A: Callback when long-press is released */
  onCardLongPressRelease?: () => void;
  /** Display mode: clean view with just card images (no badges, names, checkboxes) */
  displayMode?: boolean;
}

/**
 * Slot number badges (circled numbers for 1-12)
 * Using Unicode circled numbers for consistent display
 */
const SLOT_BADGES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

/**
 * Get variant badge info for display
 */
function getVariantBadge(variant?: string) {
  if (!variant || variant === 'base') return null;
  const badges: Record<string, { label: string; color: string }> = {
    'reverse-holo': { label: 'RH', color: '#FFD700' },
    'poke-ball': { label: 'PB', color: '#FF6B6B' },
    'master-ball': { label: 'MB', color: '#4ECDC4' },
  };
  return badges[variant] || null;
}

/**
 * BinderPageView displays one binder page at a time
 * Shows cards in a grid layout with slot numbers visible on each position
 * Memoized for performance during view mode switches
 */
function BinderPageViewComponent({
  cards,
  currentPage,
  totalPages,
  cardsPerPage,
  columns,
  cardWidth,
  binderId,
  onPageChange,
  onCardPress,
  onEmptySlotPress,
  isCustomMode = false,
  collectionMode,
  onCardLongPress,
  onCardLongPressRelease,
  displayMode = false,
}: BinderPageViewProps) {
  const navigation = useNavigation<NavigationProp>();
  // Calculate which cards to show on the current page
  const startIndex = (currentPage - 1) * cardsPerPage;
  const pageCards = cards.slice(startIndex, startIndex + cardsPerPage);
  
  // Calculate card height based on aspect ratio (0.7)
  const cardHeight = cardWidth / 0.7;
  
  // Number of rows (3 for both 3×3 and 4×3)
  const rows = 3;

  // Render a single slot (either with card or empty)
  const renderSlot = (slotIndex: number) => {
    const card = pageCards[slotIndex];
    const globalSlotIndex = startIndex + slotIndex;
    const badge = card ? getVariantBadge(card.variant) : null;
    
    // Calculate slot display number (1-based within the page)
    const slotDisplayNumber = slotIndex + 1;
    const slotBadge = SLOT_BADGES[slotIndex] || `${slotDisplayNumber}`;
    
    if (!card) {
      // Empty slot - only shown in Custom mode or if there are fewer cards than slots
      // In display mode, show an empty space with no dashed border or text
      if (displayMode) {
        return (
          <View
            key={`empty-${slotIndex}`}
            style={[styles.slot, { width: cardWidth }]}
          >
            <View style={{ height: cardHeight }} />
          </View>
        );
      }
      return (
        <TouchableOpacity
          key={`empty-${slotIndex}`}
          style={[
            styles.slot,
            { width: cardWidth },
          ]}
          onPress={() => onEmptySlotPress?.(globalSlotIndex)}
          activeOpacity={0.7}
          disabled={!isCustomMode}
        >
          <View style={[styles.emptySlotInner, { height: cardHeight }]}>
            <Text style={styles.slotBadge}>{slotBadge}</Text>
            {isCustomMode && (
              <Text style={styles.emptySlotText}>Add Card</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }
    
    // Handle card tap - navigate to card detail screen
    const handleCardTap = () => {
      navigation.navigate('CardDetail', {
        cardId: card.id,
        binderId: binderId,
        isOwned: card.isOwned,
        collectionMode: collectionMode,
        // Pass card index for binder position display
        cardIndex: globalSlotIndex,
        cardsPerPage: cardsPerPage,
      });
    };
    
    // Handle checkbox tap - toggle ownership
    const handleCheckboxTap = () => {
      onCardPress(card);
    };
    
    // Handle long-press - enlarge preview
    const handleLongPress = () => {
      if (onCardLongPress) {
        onCardLongPress(card);
      }
    };
    
    // Slot with card
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.slot,
          { width: cardWidth },
        ]}
        onPress={handleCardTap}
        onLongPress={onCardLongPress ? handleLongPress : undefined}
        onPressOut={onCardLongPressRelease}
        delayLongPress={300}
        activeOpacity={0.7}
      >
        <View style={[styles.cardContainer, { width: cardWidth }]}>
          {/* Slot number badge - hidden in display mode */}
          {!displayMode && (
            <View style={styles.slotBadgeContainer}>
              <Text style={styles.slotBadgeOnCard}>{slotBadge}</Text>
            </View>
          )}
          
          {/* Card image - always full opacity in display mode */}
          <CardImage
            source={card.imageUrl}
            isMissing={displayMode ? false : !card.isOwned}
            aspectRatio={0.7}
            style={styles.cardImage}
            cardInfo={{ id: card.id, name: card.name, set: card.set }}
          />
          
          {/* Ownership checkbox overlay - hidden in display mode */}
          {!displayMode && (
            <TouchableOpacity 
              style={styles.checkboxOverlay}
              onPress={handleCheckboxTap}
              activeOpacity={0.7}
            >
              <Text style={styles.checkbox}>{card.isOwned ? '☑' : '☐'}</Text>
            </TouchableOpacity>
          )}
          
          {/* Variant badge - hidden in display mode */}
          {!displayMode && badge && (
            <View style={[styles.variantBadge, { backgroundColor: badge.color }]}>
              <Text style={styles.variantBadgeText}>{badge.label}</Text>
            </View>
          )}
        </View>
        
        {/* Card name and number - hidden in display mode */}
        {!displayMode && (
          <>
            <Text style={styles.cardName} numberOfLines={1}>
              {card.name}
            </Text>
            <Text style={styles.cardNumber} numberOfLines={1}>
              {card.number}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Render a row of slots
  const renderRow = (rowIndex: number) => {
    const slots = [];
    for (let col = 0; col < columns; col++) {
      const slotIndex = rowIndex * columns + col;
      if (slotIndex < cardsPerPage) {
        slots.push(renderSlot(slotIndex));
      }
    }
    return (
      <View key={`row-${rowIndex}`} style={styles.row}>
        {slots}
      </View>
    );
  };

  // Render all rows
  const renderGrid = () => {
    const rowElements = [];
    for (let row = 0; row < rows; row++) {
      rowElements.push(renderRow(row));
    }
    return rowElements;
  };

  return (
    <View style={styles.container}>
      {/* Page grid */}
      <View style={styles.grid}>
        {renderGrid()}
      </View>
      
      {/* Page info footer - hidden in display mode */}
      {!displayMode && (
        <View style={styles.pageInfo}>
          <Text style={styles.pageInfoText}>
            Cards {startIndex + 1} - {Math.min(startIndex + cardsPerPage, cards.length)} of {cards.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  slot: {
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  cardContainer: {
    position: 'relative',
    width: '100%',
  },
  cardImage: {
    width: '100%',
    borderRadius: borderRadius.sm,
  },
  // Slot badge (number in circle)
  slotBadgeContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    zIndex: 10,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeOnCard: {
    fontSize: 14,
    fontWeight: typography.bold,
    color: colors.background,
  },
  slotBadge: {
    fontSize: typography.xl,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  // Checkbox overlay
  checkboxOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.overlayLight,
    borderRadius: borderRadius.sm,
    padding: 4,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    fontSize: 20,
  },
  // Variant badge
  variantBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantBadgeText: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: colors.background,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Empty slot
  emptySlotInner: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptySlotText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  // Card info below image
  cardName: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  cardNumber: {
    fontSize: typography.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  // Page info footer
  pageInfo: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
  },
});

// Memoize the component to prevent unnecessary re-renders
const BinderPageView = memo(BinderPageViewComponent);
export default BinderPageView;
