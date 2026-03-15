import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/theme';
import type { OwnershipFilter } from '../../hooks/useCardFilter';

interface FilterPanelProps {
  ownershipFilter: OwnershipFilter;
  onOwnershipFilterChange: (filter: OwnershipFilter) => void;
  showPageBreaks?: boolean;
  onShowPageBreaksChange?: (show: boolean) => void;
}

/**
 * Filter panel component with ownership filter
 */
export default function FilterPanel({
  ownershipFilter,
  onOwnershipFilterChange,
  showPageBreaks,
  onShowPageBreaksChange,
}: FilterPanelProps) {
  return (
    <View style={styles.container}>
      {/* Ownership Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Show:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              ownershipFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => onOwnershipFilterChange('all')}
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

      {/* Page Breaks Toggle - only shown when handler is provided */}
      {onShowPageBreaksChange && (
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => onShowPageBreaksChange(!showPageBreaks)}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: '#333',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: fonts.medium,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#333',
  },
  toggleIcon: {
    fontSize: 20,
    color: '#007AFF',
  },
});
