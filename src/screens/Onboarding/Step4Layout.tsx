import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/theme';
import type { LayoutPreference } from '../../types';

interface Step4LayoutProps {
  value: LayoutPreference | null;
  onChange: (layout: LayoutPreference) => void;
}

export default function Step4Layout({ value, onChange }: Step4LayoutProps) {
  const options: { key: LayoutPreference; label: string; description: string }[] = [
    {
      key: '3x3',
      label: '3×3 Grid',
      description: 'Show 3 cards per row (9 cards visible)',
    },
    {
      key: '4x3',
      label: '4×3 Grid',
      description: 'Show 4 cards per row (12 cards visible)',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Layout Preference</Text>
      <Text style={styles.description}>
        Choose how you want cards displayed in your binder view.
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
