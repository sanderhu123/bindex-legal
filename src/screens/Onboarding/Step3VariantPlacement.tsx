import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography, borderRadius, shadows, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { VariantPlacement } from '../../types';
import VariantOrderSelector from '../../components/Binder/VariantOrderSelector';

interface Step3VariantPlacementProps {
  value: VariantPlacement | null;
  onChange: (placement: VariantPlacement) => void;
  variantOrder: string[];
  onOrderChange: (order: string[]) => void;
}

export default function Step3VariantPlacement({ value, onChange, variantOrder, onOrderChange }: Step3VariantPlacementProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const options: { key: VariantPlacement; label: string; description: string }[] = [
    {
      key: 'grouped',
      label: 'Grouped',
      description: 'Show variants right after their regular card',
    },
    {
      key: 'end',
      label: 'At the End',
      description: 'Show all variants at the end of the collection',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Variant Placement</Text>
      <Text style={styles.description}>
        Choose how you want variant cards to be displayed in your binder.
      </Text>
      
      {options.map((option) => {
        const isSelected = value === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(option.key)}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionTextWrapper}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.title, styles.orderTitle]}>Display Order</Text>
      <Text style={styles.description}>
        Set the order in which card groups appear in your binder. Use the arrows to rearrange.
      </Text>
      <VariantOrderSelector order={variantOrder} onChange={onOrderChange} />
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
  option: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTextWrapper: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
  orderTitle: {
    marginTop: spacing.xl,
  },
});
