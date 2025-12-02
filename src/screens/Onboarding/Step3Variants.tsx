import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import VariantSelector from '../../components/Binder/VariantSelector';

interface Step3VariantsProps {
  selectedVariants: string[];
  onChange: (variants: string[]) => void;
}

export default function Step3Variants({
  selectedVariants,
  onChange,
}: Step3VariantsProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Select Variants to Track</Text>
      <Text style={styles.description}>
        Base cards are always included. Choose additional variants you want to track.
      </Text>
      <VariantSelector
        selected={selectedVariants}
        onChange={onChange}
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


