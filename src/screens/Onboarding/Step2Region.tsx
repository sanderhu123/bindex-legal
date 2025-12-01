import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import RegionSelector from '../../components/Binder/RegionSelector';
import type { Region } from '../../services/api/pokemonApi';

interface Step2RegionProps {
  selectedRegion: Region | null;
  onChange: (region: Region) => void;
}

export default function Step2Region({ selectedRegion, onChange }: Step2RegionProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Select Region</Text>
      <Text style={styles.description}>
        Choose the Pokédex region you want to collect cards from.
      </Text>
      <RegionSelector value={selectedRegion} onChange={onChange} />
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
