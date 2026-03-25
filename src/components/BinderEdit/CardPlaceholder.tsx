import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import CardImage from '../Card/CardImage';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, borderRadius, shadows, fonts, type ThemeColors } from '../../constants/theme';

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
  /** Called when an empty placeholder slot is tapped (opens card picker) */
  onEmptySlotPress?: (index: number) => void;
  /** Called when trash zone is tapped (only when card is selected) */
  onTrashPress?: () => void;
  /** Whether a card is currently selected (enables trash zone) */
  hasSelectedCard: boolean;
  /** Whether a drag is currently in progress (shows trash zone as drop target) */
  isDragging?: boolean;
  /** Whether a card is currently being dragged over the placeholder area */
  isDragOverPlaceholder?: boolean;
  /** Whether a card is currently being dragged over the trash zone */
  isDragOverTrash?: boolean;
  /** Ref callback for the placeholder content area (for drag measurement) */
  placeholderAreaRef?: (ref: View | null) => void;
  /** Ref callback for the trash zone (for drag measurement) */
  trashZoneRef?: (ref: View | null) => void;
  /** Called when a long-press drag starts on a placeholder card */
  onCardDragStart?: (
    data: { cardId: string; cardName?: string; imageUrl?: string; index: number },
    touchX: number,
    touchY: number,
  ) => void;
  /** Called on each drag movement from placeholder card */
  onCardDragUpdate?: (touchX: number, touchY: number) => void;
  /** Called when drag ends from placeholder card */
  onCardDragEnd?: (touchX: number, touchY: number) => void;
  /** Called when drag gesture finalizes from placeholder card */
  onCardDragFinalize?: () => void;
  /** Register a ref for each placeholder card (for drag drop target measurement) */
  registerCardRef?: (index: number, ref: View | null) => void;
}

/**
 * A single draggable card in the placeholder tray.
 * Supports tap-to-select and long-press-to-drag.
 */
function PlaceholderCardItem({
  card,
  index,
  isSelected,
  onPress,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDragFinalize,
  registerRef,
}: {
  card: PlaceholderCard;
  index: number;
  isSelected: boolean;
  onPress: () => void;
  onDragStart?: (
    data: { cardId: string; cardName?: string; imageUrl?: string; index: number },
    touchX: number,
    touchY: number,
  ) => void;
  onDragUpdate?: (touchX: number, touchY: number) => void;
  onDragEnd?: (touchX: number, touchY: number) => void;
  onDragFinalize?: () => void;
  registerRef?: (index: number, ref: View | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Refs for stable gesture callbacks
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const onDragUpdateRef = useRef(onDragUpdate);
  onDragUpdateRef.current = onDragUpdate;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const onDragFinalizeRef = useRef(onDragFinalize);
  onDragFinalizeRef.current = onDragFinalize;

  const cardDataRef = useRef({ ...card, index });
  cardDataRef.current = { ...card, index };

  // Tap gesture for selection
  const tapGesture = useMemo(
    () => Gesture.Tap().onEnd(() => onPressRef.current()),
    [],
  );

  // Pan gesture for drag (long press activation)
  const panGesture = useMemo(() => {
    const gesture = Gesture.Pan()
      .activateAfterLongPress(300)
      .onStart((e) => {
        const data = cardDataRef.current;
        onDragStartRef.current?.(
          {
            cardId: data.cardId,
            cardName: data.cardName,
            imageUrl: data.imageUrl,
            index: data.index,
          },
          e.absoluteX,
          e.absoluteY,
        );
      })
      .onUpdate((e) => {
        onDragUpdateRef.current?.(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        onDragEndRef.current?.(e.absoluteX, e.absoluteY);
      })
      .onFinalize(() => {
        onDragFinalizeRef.current?.();
      });

    if (!onDragStart) {
      gesture.enabled(false);
    }

    return gesture;
  }, [!!onDragStart]);

  const composedGesture = useMemo(
    () => Gesture.Exclusive(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        ref={(ref) => registerRef?.(index, ref)}
        style={[styles.card, isSelected && styles.cardSelected]}
        accessibilityLabel={`${card.cardName || 'Card'} in placeholder, tap to select`}
      >
        <CardImage
          source={card.imageUrl}
          style={styles.cardImage}
          cardInfo={{ id: card.cardId, name: card.cardName }}
        />
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} style={styles.selectedCheck} />
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

/**
 * CardPlaceholder is the bottom tray in binder edit mode.
 *
 * Features:
 * - Horizontal scrolling list of cards temporarily removed from binder
 * - Maximum 18 cards
 * - Trash zone on the right (visible when card is selected or dragging)
 * - Cards can be tapped to select or long-pressed to drag
 * - Visual feedback when dragging over placeholder or trash
 */
export function CardPlaceholder({
  cards,
  maxCards = 18,
  selectedIndex,
  onCardPress,
  onEmptySlotPress,
  onTrashPress,
  hasSelectedCard,
  isDragging = false,
  isDragOverPlaceholder = false,
  isDragOverTrash = false,
  placeholderAreaRef,
  trashZoneRef,
  onCardDragStart,
  onCardDragUpdate,
  onCardDragEnd,
  onCardDragFinalize,
  registerCardRef,
}: CardPlaceholderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardCount = cards.length;

  // Show trash zone when a card is selected OR when a drag is in progress
  const showTrashZone = hasSelectedCard || isDragging;

  // Build the full list of slots (filled cards + empty slots up to maxCards)
  const slots = Array.from({ length: maxCards }, (_, i) => {
    if (i < cards.length) {
      return { type: 'card' as const, card: cards[i], index: i };
    }
    return { type: 'empty' as const, card: null, index: i };
  });

  return (
    <View
      ref={(ref) => placeholderAreaRef?.(ref)}
      style={[styles.container, isDragOverPlaceholder && styles.containerDragOver]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="albums-outline" size={16} color={colors.textSecondary} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>CARD PLACEHOLDER</Text>
        </View>
        <Text style={styles.headerCount}>
          {cardCount}/{maxCards}
        </Text>
      </View>

      {/* Cards row - always shows all 18 slots */}
      <View style={styles.contentRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
          style={styles.cardsScroll}
          scrollEnabled={!isDragging} // Disable scroll while dragging
        >
          {slots.map((slot) => {
            if (slot.type === 'card' && slot.card) {
              return (
                <PlaceholderCardItem
                  key={`filled-${slot.card.cardId}-${slot.index}`}
                  card={slot.card}
                  index={slot.index}
                  isSelected={selectedIndex === slot.index}
                  onPress={() => onCardPress(slot.index, slot.card!.cardId)}
                  onDragStart={onCardDragStart}
                  onDragUpdate={onCardDragUpdate}
                  onDragEnd={onCardDragEnd}
                  onDragFinalize={onCardDragFinalize}
                  registerRef={registerCardRef}
                />
              );
            }

            // Empty slot
            return (
              <TouchableOpacity
                key={`empty-${slot.index}`}
                style={styles.emptySlot}
                onPress={() => onEmptySlotPress?.(slot.index)}
                activeOpacity={0.6}
                accessibilityLabel={`Empty placeholder slot ${slot.index + 1}, tap to add card`}
              >
                <Text style={styles.emptySlotPlus}>+</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Trash Zone - always rendered so the ref/measurement is available,
            but visually hidden when no card is selected and no drag is active */}
        <TouchableOpacity
          ref={(ref) => trashZoneRef?.(ref as unknown as View | null)}
          style={[
            styles.trashZone,
            !showTrashZone && styles.trashZoneHidden,
            isDragOverTrash && styles.trashZoneActive,
          ]}
          onPress={showTrashZone ? onTrashPress : undefined}
          disabled={!showTrashZone}
          activeOpacity={0.7}
          accessibilityLabel="Trash zone, tap to remove selected card"
        >
          <Ionicons name="trash-outline" size={24} color={colors.error} style={styles.trashIcon} />
          <Text style={[styles.trashText, isDragOverTrash && styles.trashTextActive]}>
            {isDragOverTrash ? 'Drop to\nRemove' : 'Remove'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
  },
  containerDragOver: {
    borderTopColor: colors.success,
    borderTopWidth: 3,
    backgroundColor: colors.success + '14',
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
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  headerCount: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
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
  emptySlot: {
    width: 56,
    height: 78,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotPlus: {
    fontSize: 22,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  card: {
    width: 56,
    height: 78,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.background,
    // Always have a border to prevent layout shift when selecting/deselecting
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardSelected: {
    // Only change border color, not width (prevents layout shift / blank flash)
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
    backgroundColor: colors.primary + '4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    fontSize: 20,
    color: colors.onPrimary,
  },
  trashZone: {
    width: 70,
    height: 78,
    marginRight: spacing.md,
    backgroundColor: colors.error + '25',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashZoneHidden: {
    width: 0,
    marginRight: 0,
    borderWidth: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  trashZoneActive: {
    backgroundColor: colors.error + '59',
    borderWidth: 3,
    borderStyle: 'solid',
    borderColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  trashIcon: {
    fontSize: 24,
  },
  trashText: {
    fontSize: typography.xs,
    color: colors.error,
    fontFamily: fonts.medium,
    marginTop: 2,
    textAlign: 'center',
  },
  trashTextActive: {
    color: colors.error,
    fontFamily: fonts.bold,
  },
});

export default CardPlaceholder;
