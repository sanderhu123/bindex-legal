import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, type ThemeColors } from '../../constants/theme';
import type { OwnershipFilter } from '../../hooks/useCardFilter';

interface FilterPanelProps {
  ownershipFilter: OwnershipFilter;
  onOwnershipFilterChange: (filter: OwnershipFilter) => void;
  showPageBreaks?: boolean;
  onShowPageBreaksChange?: (show: boolean) => void;
}

export default function FilterPanel({
  ownershipFilter,
  onOwnershipFilterChange,
  showPageBreaks,
  onShowPageBreaksChange,
}: FilterPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Show:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              ownershipFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => onOwnershipFilterChange('all')}
            accessibilityRole="button"
            accessibilityLabel="Show all cards"
            accessibilityState={{ selected: ownershipFilter === 'all' }}
          >
            <Text
              style={[
                styles.filterButtonText,
                ownershipFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              ownershipFilter === 'owned' && styles.filterButtonActive,
            ]}
            onPress={() => onOwnershipFilterChange('owned')}
            accessibilityRole="button"
            accessibilityLabel="Show owned cards only"
            accessibilityState={{ selected: ownershipFilter === 'owned' }}
          >
            <Text
              style={[
                styles.filterButtonText,
                ownershipFilter === 'owned' && styles.filterButtonTextActive,
              ]}
            >
              Owned
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              ownershipFilter === 'missing' && styles.filterButtonActive,
            ]}
            onPress={() => onOwnershipFilterChange('missing')}
            accessibilityRole="button"
            accessibilityLabel="Show missing cards only"
            accessibilityState={{ selected: ownershipFilter === 'missing' }}
          >
            <Text
              style={[
                styles.filterButtonText,
                ownershipFilter === 'missing' && styles.filterButtonTextActive,
              ]}
            >
              Missing
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {onShowPageBreaksChange && (
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => onShowPageBreaksChange(!showPageBreaks)}
          accessibilityRole="checkbox"
          accessibilityLabel="Show page breaks"
          accessibilityState={{ checked: !!showPageBreaks }}
        >
          <Text style={styles.toggleLabel}>Show page breaks</Text>
          <Text style={styles.toggleIcon}>
            {showPageBreaks ? '☑' : '☐'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    filterSection: {
      marginBottom: 12,
    },
    filterLabel: {
      fontSize: typography.sm,
      fontFamily: fonts.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    filterButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      fontFamily: fonts.medium,
    },
    filterButtonTextActive: {
      color: colors.onPrimary,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: spacing.xs,
      marginTop: spacing.xs,
    },
    toggleLabel: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.text,
    },
    toggleIcon: {
      fontSize: typography.xl,
      color: colors.primary,
    },
  });
