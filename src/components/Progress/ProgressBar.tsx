import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface ProgressBarProps {
  /** Current value (e.g., owned cards) */
  current: number;
  /** Total value (e.g., total cards) */
  total: number;
  /** Optional: Custom percentage (if not provided, calculated from current/total) */
  percentage?: number;
  /** Display format: 'compact' shows "X cards • Y%", 'full' shows "X / Y cards (Z%)", 'ratio' shows "X / Y cards" */
  format?: 'compact' | 'full' | 'ratio';
  /** Optional: Custom text to display instead of default format */
  customText?: string;
  /** Text size: 'small' (12px) for compact views, 'large' (20px) for prominent displays */
  textSize?: 'small' | 'large';
}

/**
 * Reusable progress bar component
 * Displays a visual progress bar with percentage and card count
 */
export default function ProgressBar({
  current,
  total,
  percentage,
  format = 'full',
  customText,
  textSize = 'small',
}: ProgressBarProps) {
  // Calculate percentage if not provided, always round to whole number
  const progressPercentage = percentage ?? (total > 0 ? Math.round((current / total) * 100) : 0);
  const clampedPercentage = Math.min(100, Math.max(0, Math.round(progressPercentage)));
  const displayPercentage = Math.round(clampedPercentage); // Ensure whole number for display

  // Format text based on format prop
  const getProgressText = (): string => {
    if (customText) {
      return customText;
    }

    if (format === 'compact') {
      return `${current} cards • ${displayPercentage}%`;
    } else if (format === 'ratio') {
      // format === 'ratio' - shows just "X / Y cards" without percentage
      const displayTotal = total > 0 ? total : (displayPercentage > 0 ? Math.round((current / displayPercentage) * 100) : 0);
      return `${current} / ${displayTotal} cards`;
    } else {
      // format === 'full'
      // If total is 0 but we have percentage, estimate total from current and percentage
      const displayTotal = total > 0 ? total : (displayPercentage > 0 ? Math.round((current / displayPercentage) * 100) : 0);
      return `${current} / ${displayTotal} cards (${displayPercentage}%)`;
    }
  };

  const textStyle = textSize === 'large' ? styles.textLarge : styles.text;

  return (
    <View style={styles.container}>
      <Text style={textStyle}>{getProgressText()}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${clampedPercentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  text: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  textLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  barContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
});

