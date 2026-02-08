import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';

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
 * Only rendered when a card is selected in edit mode.
 * 
 * Uses a full-height wrapper to maximize the tappable area.
 */
export function InsertButton({ onPress }: InsertButtonProps) {
  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={0.5}
      accessibilityLabel="Insert card here"
      accessibilityRole="button"
    >
      <View style={styles.button}>
        <Text style={styles.icon}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Outer wrapper stretches to full row height for a bigger tap target
  wrapper: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  // Inner visual button
  button: {
    width: 24,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  icon: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default InsertButton;
