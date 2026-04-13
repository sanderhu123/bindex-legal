import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography, borderRadius, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const GROUP_LABELS: Record<string, string> = {
  'base': 'Regular',
  'reverse-holo': 'Reverse Holo',
  'poke-ball': 'Poké Ball Holo',
  'master-ball': 'Master Ball Holo',
  'stamp': 'Stamp Holo',
  'energy': 'Energy Holo',
  'secret-rare': 'Secret Rares',
  'main-set': 'Main Set Cards',
};

interface VariantOrderSelectorProps {
  order: string[];
  onChange: (newOrder: string[]) => void;
}

export default function VariantOrderSelector({ order, onChange }: VariantOrderSelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
  };

  return (
    <View>
      {order.map((key, index) => (
        <View key={key} style={styles.item}>
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>{index + 1}</Text>
          </View>
          <Text style={styles.label}>{GROUP_LABELS[key] || key}</Text>
          <View style={styles.arrows}>
            <TouchableOpacity
              onPress={() => moveUp(index)}
              disabled={index === 0}
              style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
              activeOpacity={0.6}
            >
              <Ionicons
                name="chevron-up"
                size={20}
                color={index === 0 ? colors.textLight : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => moveDown(index)}
              disabled={index === order.length - 1}
              style={[styles.arrowButton, index === order.length - 1 && styles.arrowDisabled]}
              activeOpacity={0.6}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={index === order.length - 1 ? colors.textLight : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  positionText: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
  label: {
    flex: 1,
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  arrows: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  arrowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
});
