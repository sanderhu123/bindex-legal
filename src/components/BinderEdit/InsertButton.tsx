import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { fonts, spacing, typography } from '../../constants/theme';

/**
 * Props for InsertButton component
 */
export interface InsertButtonProps {
  /** Called when the plus sign is tapped */
  onPress: () => void;
  /** True when a card is being dragged over this button — shows highlight */
  isDragHover?: boolean;
  /**
   * Callback ref for the outer View. The parent screen uses this to measure
   * the button's on-screen position so it can be hit-tested as a drop target
   * during a drag.
   */
  viewRef?: (ref: View | null) => void;
}
/**
 * InsertButton is the "+" button shown between cards.
 *
 * Tapping it inserts the selected card at that position,
 * shifting all cards to the right.
 *
 * Visually slim (12px wide) to save space in the grid,
 * but uses hitSlop to extend the tappable area
 * so the user can still easily tap it.
 *
 * When `isDragHover` is true, the button highlights to indicate
 * a dragged card will be inserted here on release.
 */
export function InsertButton({ onPress, isDragHover = false, viewRef }: InsertButtonProps) {
  return (
    <View ref={viewRef} style={styles.wrapper} collapsable={false}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.5}
        hitSlop={{ left: 12, right: 12, top: 8, bottom: 8 }}
        accessibilityLabel="Insert card here"
        accessibilityRole="button"
      >
        <View style={[styles.line, isDragHover && styles.lineActive]} />
        <View style={[styles.plusCircle, isDragHover && styles.plusCircleActive]}>
          <Text style={[styles.icon, isDragHover && styles.iconActive]}>+</Text>
        </View>
        <View style={[styles.line, isDragHover && styles.lineActive]} />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: {
    width: 12,
    alignSelf: 'stretch',
    marginHorizontal: 0,
    marginVertical: spacing.xs,
    transform: [{ translateX: -2 }],
    zIndex: 1,
  },
  touchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 1,
  },
  lineActive: {
    width: 3,
    backgroundColor: '#FFD700',
  },
  plusCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  plusCircleActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  icon: {
    color: '#FFD700',
    fontSize: 13,
    fontFamily: fonts.bold,
    lineHeight: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  iconActive: {
    color: '#FFFFFF',
    fontSize: typography.lg,
    lineHeight: 18,
  },
});
export default InsertButton;
