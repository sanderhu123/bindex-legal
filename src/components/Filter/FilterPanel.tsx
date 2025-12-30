import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { OwnershipFilter } from '../../hooks/useCardFilter';

interface FilterPanelProps {
  ownershipFilter: OwnershipFilter;
  onOwnershipFilterChange: (filter: OwnershipFilter) => void;
}

/**
 * Filter panel component with ownership filter
 */
export default function FilterPanel({
  ownershipFilter,
  onOwnershipFilterChange,
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
    fontWeight: '600',
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
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});
