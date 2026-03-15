import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import type { CollectionMode } from '../../types';

interface CollectionModeSelectorProps {
  value: CollectionMode | null;
  onChange: (mode: CollectionMode) => void;
}

const MODE_OPTIONS: { key: CollectionMode; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    key: 'master-set',
    label: 'Master Set',
    description: 'Track one specific set (e.g. Base Set, Scarlet & Violet).',
    icon: 'book-outline',
  },
  {
    key: 'region',
    label: 'Region',
    description: 'Track cards by Pokédex region (Kanto, Johto, etc.).',
    icon: 'map-outline',
  },
  {
    key: 'custom',
    label: 'Custom',
    description: 'Create your own collection with any cards from any set.',
    icon: 'grid-outline',
  },
];

export default function CollectionModeSelector({ value, onChange }: CollectionModeSelectorProps) {
  return (
    <View>
      {MODE_OPTIONS.map((mode) => {
        const isSelected = value === mode.key;
        return (
          <TouchableOpacity
            key={mode.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(mode.key)}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Ionicons
                  name={isSelected ? (mode.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : mode.icon}
                  size={20}
                  color={isSelected ? colors.primary : colors.textTertiary}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{mode.label}</Text>
                <Text style={styles.optionDescription}>{mode.description}</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
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
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    ...shadows.md,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerSelected: {
    backgroundColor: colors.primaryTint,
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    lineHeight: 20,
  },
});
