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
  const modes: { key: CollectionMode; label: string; description: string; icon: string }[] = [
    {
      key: 'master-set',
      label: 'Master Set',
      description: 'Track one specific set (e.g. Base Set, Scarlet & Violet).',
      icon: '📦',
    },
    {
      key: 'region',
      label: 'Region',
      description: 'Track cards by Pokédex region (Kanto, Johto, etc.).',
      icon: '🗺️',
    },
    {
      key: 'custom',
      label: 'Custom',
      description: 'Create your own collection with any cards from any set.',
      icon: '✨',
    },
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
            <View style={styles.optionHeader}>
              <Text style={styles.optionIcon}>{mode.icon}</Text>
              <Text style={styles.optionLabel}>{mode.label}</Text>
            </View>
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
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 28, // Align with text after icon
  },
});










