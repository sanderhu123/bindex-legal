import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, shadows, fonts, type ThemeColors } from '../../constants/theme';
import { isCustomCard, CUSTOM_CARD_COLORS } from '../../services/supabase/customCards';
import { mediumTap } from '../../utils/haptics';

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
  /** Set field (carries custom card color info as "Custom|#hex") */
  cardSet?: string;
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
  cardSet,
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEmpty = !cardId;
  const hasImage = imageUrl && imageUrl.trim() !== '';
  const isCustom = cardId ? isCustomCard(cardId) : false;

  // Extract custom card color from the set field
  let customBgColor = '#000000';
  let customTextColor = '#FFFFFF';
  if (isCustom && cardSet?.startsWith('Custom|')) {
    customBgColor = cardSet.split('|')[1] || '#000000';
    const preset = CUSTOM_CARD_COLORS.find(c => c.hex === customBgColor);
    customTextColor = preset?.textColor || '#FFFFFF';
  }

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
          mediumTap();
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
        ) : isCustom ? (
          // Custom placeholder card: solid color background with name
          <View style={[
            styles.customCardContent,
            { backgroundColor: customBgColor },
            isDragSource && { opacity: 0.3 },
          ]}>
            <Text
              style={[styles.customCardText, { color: customTextColor }]}
              numberOfLines={3}
            >
              {cardName || 'Custom Card'}
            </Text>
          </View>
        ) : (
          // Fallback placeholder when no image URL
          <View style={[styles.placeholderContent, isDragSource && { opacity: 0.3 }]}>
            <Text style={styles.placeholderIcon}>Ã°Å¸Æ’Â</Text>
            <Text style={styles.placeholderText} numberOfLines={2}>
              {cardName || 'Card'}
            </Text>
          </View>
        )}

        {/* Selection indicator - small corner badge */}
        {isSelected && (
          <View style={styles.selectionBadge}>
            <Text style={styles.checkmarkText}>Ã¢Å“â€œ</Text>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 0.716, // Card aspect ratio (245Ãƒâ€”342 pixels)
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
    fontFamily: fonts.medium,
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
    color: colors.onPrimary,
    fontSize: 14,
    fontFamily: fonts.bold,
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
  // Custom placeholder card styles
  customCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  customCardText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default CardSlot;
