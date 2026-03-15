import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { fonts, spacing, typography, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import CollectionModeSelector from '../../components/Binder/CollectionModeSelector';
import type { CollectionMode } from '../../types';

interface Step1CollectionModeProps {
  value: CollectionMode | null;
  onChange: (mode: CollectionMode) => void;
}

export default function Step1CollectionMode({ value, onChange }: Step1CollectionModeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
