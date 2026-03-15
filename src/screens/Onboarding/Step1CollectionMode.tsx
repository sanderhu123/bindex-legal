import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { colors, fonts, spacing, typography, screenPadding } from '../../constants/theme';
import CollectionModeSelector from '../../components/Binder/CollectionModeSelector';
import type { CollectionMode } from '../../types';

interface Step1CollectionModeProps {
  value: CollectionMode | null;
  onChange: (mode: CollectionMode) => void;
}

export default function Step1CollectionMode({ value, onChange }: Step1CollectionModeProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image
        source={require('../../../assets/logo-icon-teal.png')}
        style={styles.logo}
        resizeMode="contain"
      />
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
    padding: screenPadding,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: spacing.lg,
    opacity: 0.8,
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
