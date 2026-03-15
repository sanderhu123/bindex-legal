import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography, borderRadius, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { Region } from '../../services/api/pokemonApi';

interface RegionSelectorProps {
  value: Region | null;
  onChange: (region: Region) => void;
}

const REGION_DATA: { name: Region; gen: string; count: number }[] = [
  { name: 'Kanto', gen: 'Gen I', count: 151 },
  { name: 'Johto', gen: 'Gen II', count: 100 },
  { name: 'Hoenn', gen: 'Gen III', count: 135 },
  { name: 'Sinnoh', gen: 'Gen IV', count: 107 },
  { name: 'Unova', gen: 'Gen V', count: 156 },
  { name: 'Kalos', gen: 'Gen VI', count: 72 },
  { name: 'Alola', gen: 'Gen VII', count: 88 },
  { name: 'Galar', gen: 'Gen VIII', count: 89 },
  { name: 'Paldea', gen: 'Gen IX', count: 120 },
];

export default function RegionSelector({ value, onChange }: RegionSelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      {REGION_DATA.map((region) => {
        const isSelected = value === region.name;
        return (
          <TouchableOpacity
            key={region.name}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(region.name)}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View style={styles.textArea}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {region.name}
                </Text>
                <Text style={styles.optionMeta}>
                  {region.gen} · {region.count} Pokémon
                </Text>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  option: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
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
  optionMeta: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
});

