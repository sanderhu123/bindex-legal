import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface VariantSelectorProps {
  selected: string[];
  onChange: (variants: string[]) => void;
  /**
   * Limit which variant keys are shown (e.g. only reverse-holo, poke-ball, master-ball).
   * If not provided, all known variants are shown.
   */
  availableKeys?: string[];
}

const AVAILABLE_VARIANTS: { key: string; label: string }[] = [
  { key: 'base', label: 'Regular' },
  { key: 'reverse-holo', label: 'Reverse Holo' },
  { key: 'poke-ball', label: 'Poké Ball Holo' },
  { key: 'master-ball', label: 'Master Ball Holo' },
];

export default function VariantSelector({
  selected,
  onChange,
  availableKeys,
}: VariantSelectorProps) {
  const toggleVariant = (key: string) => {
    let newSelected: string[];
    if (selected.includes(key)) {
      newSelected = selected.filter((v) => v !== key);
      console.log('[VariantSelector] REMOVED variant:', key);
    } else {
      newSelected = [...selected, key];
      console.log('[VariantSelector] ADDED variant:', key);
    }
    console.log('[VariantSelector] New selected variants:', newSelected);
    onChange(newSelected);
  };

  const variantsToShow = availableKeys
    ? AVAILABLE_VARIANTS.filter((v) => availableKeys.includes(v.key))
    : AVAILABLE_VARIANTS;

  return (
    <View>
      {variantsToShow.map((variant) => {
        const isSelected = selected.includes(variant.key);
        return (
          <TouchableOpacity
            key={variant.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => toggleVariant(variant.key)}
          >
            <Text style={styles.optionLabel}>{variant.label}</Text>
            <Text style={styles.optionSubtitle}>
              {isSelected ? 'Tracking this variant' : 'Tap to include this variant'}
            </Text>
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
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
});


