import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

/**
 * Data sent when a drag starts from this slot
 */
export interface DragStartData {
  cardId: string;
  cardName?: string;
  imageUrl?: string;
  slotIndex: number;
}

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
  /** Whether this slot is currently selected (tap-selected) */
  isSelected: boolean;
  /** Called when slot is tapped */
  onPress: () => void;
  /** Layout preference for sizing */
  layoutPreference?: '3x3' | '4x3';
  /** Whether a card is currently being dragged over this slot */
  isDraggedOver?: boolean;
  /** Whether this slot is the source of the current drag (show ghost) */
  isDragSource?: boolean;
  /** Called when a long-press drag starts on this slot */
  onDragStart?: (data: DragStartData, touchX: number, touchY: number) => void;
  /** Called on each drag movement */
  onDragUpdate?: (touchX: number, touchY: number) => void;
  /** Called when the drag ends (finger lifts) */
  onDragEnd?: (touchX: number, touchY: number) => void;
  /** Called when the gesture finalizes (end or cancel) */
  onDragFinalize?: () => void;
}

/**
 * CardSlot represents a single card position in the binder edit grid.
 *
 * Supports:
 * - Tap to select/swap/move (existing behavior)
 * - Long-press + drag for drag & drop
 * - Visual states: empty, filled, selected, drag source, drop target
 */
export function CardSlot({
  cardId,
  imageUrl,
  cardName,
  slotIndex,
  isSelected,
  onPress,
  layoutPreference = '3x3',
  isDraggedOver = false,
  isDragSource = false,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDragFinalize,
}: CardSlotProps) {
  const isEmpty = !cardId;
  const hasImage = imageUrl && imageUrl.trim() !== '';

  // Use refs for callbacks so gestures don't need to be recreated on every render
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

  // Store current card data in a ref so gesture callbacks always have latest values
  const cardDataRef = useRef({ cardId, cardName, imageUrl, slotIndex });
  cardDataRef.current = { cardId, cardName, imageUrl, slotIndex };

  // Tap gesture for normal press (select/swap/move/open picker)
  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        onPressRef.current();
      }),
    [],
  );

  // Pan gesture for drag & drop (activates after 300ms long press)
  // Only enabled on filled slots that have a drag handler
  const panGesture = useMemo(() => {
    const gesture = Gesture.Pan()
      .activateAfterLongPress(300)
      .onStart((e) => {
        const data = cardDataRef.current;
        if (data.cardId) {
          onDragStartRef.current?.(
            {
              cardId: data.cardId,
              cardName: data.cardName,
              imageUrl: data.imageUrl,
              slotIndex: data.slotIndex,
            },
            e.absoluteX,
            e.absoluteY,
          );
        }
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

    // Disable pan on empty slots or when no drag handler is provided
    if (!cardId || !onDragStart) {
      gesture.enabled(false);
    }

    return gesture;
  }, [!!cardId, !!onDragStart]);

  // Pan wins over tap when long press is detected
  const composedGesture = useMemo(
    () => Gesture.Exclusive(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={[
          styles.container,
          layoutPreference === '4x3' && styles.container4x3,
          isEmpty && styles.emptyContainer,
          isSelected && styles.selectedContainer,
          isDraggedOver && styles.dropTargetContainer,
          isDragSource && styles.dragSourceContainer,
        ]}
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
              style={[styles.cardImage, isDragSource && styles.dragSourceImage]}
              contentFit="contain"
              transition={0}
              cachePolicy="memory-disk"
            />
          </View>
        ) : (
          // Fallback placeholder when no image URL
          <View style={[styles.placeholderContent, isDragSource && { opacity: 0.3 }]}>
            <Text style={styles.placeholderIcon}>🃏</Text>
            <Text style={styles.placeholderText} numberOfLines={2}>
              {cardName || 'Card'}
            </Text>
          </View>
        )}

        {/* Selection indicator - small corner badge */}
        {isSelected && (
          <View style={styles.selectionBadge}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}

        {/* Drop target highlight overlay */}
        {isDraggedOver && (
          <View style={styles.dropTargetOverlay} />
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 0.716, // Card aspect ratio (245×342 pixels)
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
    // Always have 4px border to prevent layout shift when selecting/deselecting
    borderWidth: 4,
    borderColor: 'transparent',
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
    // Only change border color, not width (prevents layout shift / grey flash)
    borderColor: colors.primary,
    // Add glow effect for better visibility
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  dropTargetContainer: {
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  dragSourceContainer: {
    opacity: 0.3,
    borderColor: colors.textTertiary,
    borderStyle: 'dashed',
  },
  dragSourceImage: {
    opacity: 0.3,
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
  // Selection badge - small corner indicator
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
  // Drop target highlight overlay (green glow when hovering)
  dropTargetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
});

export default CardSlot;
