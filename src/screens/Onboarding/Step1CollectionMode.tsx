import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { fonts } from '../../constants/theme';
import CollectionModeSelector from '../../components/Binder/CollectionModeSelector';
import type { CollectionMode } from '../../types';

interface Step1CollectionModeProps {
  value: CollectionMode | null;
  onChange: (mode: CollectionMode) => void;
}

export default function Step1CollectionMode({ value, onChange }: Step1CollectionModeProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choose Collection Mode</Text>
      <Text style={styles.description}>
        Select how you want to organize your binder collection.
      </Text>
      <CollectionModeSelector value={value} onChange={onChange} />
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
