import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, typography, borderRadius, shadows } from '../../constants/theme';

interface VariantSelectorProps {
  selected: string[];
  onChange: (variants: string[]) => void;
  availableKeys?: string[];
}

const AVAILABLE_VARIANTS: { key: string; label: string }[] = [
  { key: 'base', label: 'Regular' },
  { key: 'reverse-holo', label: 'Reverse Holo' },
  { key: 'poke-ball', label: 'Poké Ball Holo' },
  { key: 'master-ball', label: 'Master Ball Holo' },
];

export default function VariantSelector({
  selected,
  onChange,
  availableKeys,
}: VariantSelectorProps) {
  const toggleVariant = (key: string) => {
    let newSelected: string[];
    if (selected.includes(key)) {
      newSelected = selected.filter((v) => v !== key);
    } else {
      newSelected = [...selected, key];
    }
    onChange(newSelected);
  };

  const variantsToShow = availableKeys
    ? AVAILABLE_VARIANTS.filter((v) => availableKeys.includes(v.key))
    : AVAILABLE_VARIANTS;

  return (
    <View>
      {variantsToShow.map((variant) => {
        const isSelected = selected.includes(variant.key);
        return (
          <TouchableOpacity
            key={variant.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => toggleVariant(variant.key)}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
              </View>
              <View style={styles.textArea}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {variant.label}
                </Text>
                <Text style={styles.optionSubtitle}>
                  {isSelected ? 'Tracking this variant' : 'Tap to include'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    ...shadows.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.background,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textArea: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionSubtitle: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
});
