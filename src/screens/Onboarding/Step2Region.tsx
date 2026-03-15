import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts, spacing, typography, screenPadding } from '../../constants/theme';
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
    padding: screenPadding,
  },
  title: {
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
});
