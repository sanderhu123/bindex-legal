import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { fonts } from '../../constants/theme';
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
  // Get available variants for the selected set
  const availableVariants = selectedSetId 
    ? getAvailableVariantsForSet(selectedSetId)
    : ['base', 'reverse-holo']; // Fallback if no set selected

  console.log('[Step3Variants] ===== VARIANT SELECTION =====');
  console.log('[Step3Variants] Selected Set ID:', selectedSetId);
  console.log('[Step3Variants] Available Variants:', availableVariants);
  console.log('[Step3Variants] Currently Selected:', selectedVariants);
  console.log('[Step3Variants] ================================');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Select Variants to Track</Text>
      <Text style={styles.description}>
        Choose which card versions you want to track in your binder.
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
    fontFamily: fonts.bold,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 24,
  },
});


