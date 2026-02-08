import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';

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
 */
export function InsertButton({ onPress }: InsertButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityLabel="Insert card here"
      accessibilityRole="button"
    >
      <Text style={styles.icon}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 4,
    alignSelf: 'center',
  },
  icon: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InsertButton;
