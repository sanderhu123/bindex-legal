import React, { memo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../constants/theme';

type ViewMode = 'grid' | 'list' | 'binder';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * View mode toggle buttons (Grid / List / Binder)
 * Memoized to prevent unnecessary re-renders that cause touch issues
 */
function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'grid' && styles.toggleButtonActive]}
        onPress={() => onViewModeChange('grid')}
      >
        <Text style={[styles.toggleButtonText, viewMode === 'grid' && styles.toggleButtonTextActive]}>
          Grid
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
        onPress={() => onViewModeChange('list')}
      >
        <Text style={[styles.toggleButtonText, viewMode === 'list' && styles.toggleButtonTextActive]}>
          List
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'binder' && styles.toggleButtonActive]}
        onPress={() => onViewModeChange('binder')}
      >
        <Text style={[styles.toggleButtonText, viewMode === 'binder' && styles.toggleButtonTextActive]}>
          Binder
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default memo(ViewModeToggle);

const styles = StyleSheet.create({
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textTertiary,
  },
  toggleButtonTextActive: {
    color: colors.background,
  },
});
