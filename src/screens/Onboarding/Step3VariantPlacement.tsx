import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/theme';
import type { VariantPlacement } from '../../types';

interface Step3VariantPlacementProps {
  value: VariantPlacement | null;
  onChange: (placement: VariantPlacement) => void;
}

export default function Step3VariantPlacement({ value, onChange }: Step3VariantPlacementProps) {
  const options: { key: VariantPlacement; label: string; description: string }[] = [
    {
      key: 'grouped',
      label: 'Grouped',
      description: 'Show variants right after their regular card',
    },
    {
      key: 'end',
      label: 'At the End',
      description: 'Show all variants at the end of the collection',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Variant Placement</Text>
      <Text style={styles.description}>
        Choose how you want variant cards to be displayed in your binder.
      </Text>
      
      {options.map((option) => {
        const isSelected = value === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(option.key)}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 24,
  },
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
    fontFamily: fonts.semibold,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
  },
});
