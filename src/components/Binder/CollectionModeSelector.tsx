import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CollectionMode } from '../../types';

interface CollectionModeSelectorProps {
  value: CollectionMode | null;
  onChange: (mode: CollectionMode) => void;
}

export default function CollectionModeSelector({
  value,
  onChange,
}: CollectionModeSelectorProps) {
  const modes: { key: CollectionMode; label: string; description: string }[] = [
    {
      key: 'master-set',
      label: 'Master Set',
      description: 'Track one specific set (e.g. Base Set, Scarlet & Violet).',
    },
    {
      key: 'region',
      label: 'Region',
      description: 'Track cards by Pokédex region (Kanto, Johto, etc.).',
    },
    // Custom binders are created separately in Step 13
  ];

  return (
    <View>
      {modes.map((mode) => {
        const isSelected = value === mode.key;
        return (
          <TouchableOpacity
            key={mode.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(mode.key)}
          >
            <Text style={styles.optionLabel}>{mode.label}</Text>
            <Text style={styles.optionDescription}>{mode.description}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F0FF',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
});









