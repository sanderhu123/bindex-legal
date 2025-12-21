import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import VariantSelector from '../../components/Binder/VariantSelector';
import { getAvailableVariantsForSet } from '../../data/cardVariants';

interface Step3VariantsProps {
  selectedSetId: string | null;
  selectedVariants: string[];
  onChange: (variants: string[]) => void;
}

export default function Step3Variants({
  selectedSetId,
  selectedVariants,
  onChange,
}: Step3VariantsProps) {
  // Get available variants for the selected set (excluding 'base' which is always included)
  const availableVariants = selectedSetId 
    ? getAvailableVariantsForSet(selectedSetId).filter(v => v !== 'base')
    : ['reverse-holo']; // Fallback to just reverse-holo if no set selected

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Select Variants to Track</Text>
      <Text style={styles.description}>
        Base cards are always included. Choose additional variants you want to track.
      </Text>
      <VariantSelector
        selected={selectedVariants}
        onChange={onChange}
        availableKeys={availableVariants}
      />
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
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
});


