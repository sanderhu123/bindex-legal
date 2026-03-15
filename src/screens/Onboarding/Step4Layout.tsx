import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography, borderRadius, shadows, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { LayoutPreference } from '../../types';

interface Step4LayoutProps {
  value: LayoutPreference | null;
  onChange: (layout: LayoutPreference) => void;
}

export default function Step4Layout({ value, onChange }: Step4LayoutProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const options: { key: LayoutPreference; label: string; description: string }[] = [
    {
      key: '3x3',
      label: '3×3 Grid',
      description: 'Show 3 cards per row (9 cards visible)',
    },
    {
      key: '4x3',
      label: '4×3 Grid',
      description: 'Show 4 cards per row (12 cards visible)',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Layout Preference</Text>
      <Text style={styles.description}>
        Choose how you want cards displayed in your binder view.
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
  option: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
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
  optionTextWrapper: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
});
