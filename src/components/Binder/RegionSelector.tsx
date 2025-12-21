import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Region } from '../../services/api/pokemonApi';

interface RegionSelectorProps {
  value: Region | null;
  onChange: (region: Region) => void;
}

const REGIONS: Region[] = [
  'Kanto',
  'Johto',
  'Hoenn',
  'Sinnoh',
  'Unova',
  'Kalos',
  'Alola',
  'Galar',
  'Paldea',
];

export default function RegionSelector({ value, onChange }: RegionSelectorProps) {
  return (
    <View>
      {REGIONS.map((region) => {
        const isSelected = value === region;
        return (
          <TouchableOpacity
            key={region}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(region)}
          >
            <Text style={styles.optionLabel}>{region}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F0FF',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});







