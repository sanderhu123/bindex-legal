import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { fonts } from '../../constants/theme';

/**
 * Props for InsertButton component
 */
export interface InsertButtonProps {
  /** Called when the plus sign is tapped */
  onPress: () => void;
}
/**
 * InsertButton is the "+" button shown between cards when a card is selected.
 * 
 * Tapping it inserts the selected card at that position,
 * shifting all cards to the right.
 * 
 * Visually slim (8px wide) to save space in the grid,
 * but uses hitSlop to extend the tappable area to ~32px
 * so the user can still easily tap it.
 */
export function InsertButton({ onPress }: InsertButtonProps) {
  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={0.5}
      hitSlop={{ left: 12, right: 12, top: 8, bottom: 8 }}
      accessibilityLabel="Insert card here"
      accessibilityRole="button"
    >
      <View style={styles.line} />
      <View style={styles.plusCircle}>
        <Text style={styles.icon}>+</Text>
      </View>
      <View style={styles.line} />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  // Slim outer wrapper â€” only 8px wide in layout
  wrapper: {
    width: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  // Thin vertical line above and below the "+" circle
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 1,
  },
  // Small circle with the "+" in the middle
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
  icon: {
    color: '#FFD700',
    fontSize: 13,
    fontFamily: fonts.bold,
    lineHeight: 15,
    textAlign: 'center',
  },
});
export default InsertButton;
