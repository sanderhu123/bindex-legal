import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { fonts, spacing, typography, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const availableVariants = selectedSetId 
    ? getAvailableVariantsForSet(selectedSetId)
    : ['base', 'reverse-holo'];

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
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
});
