import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography, borderRadius, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const VARIANT_LABELS: Record<string, string> = {
  'base': 'Regular',
  'reverse-holo': 'Reverse Holo',
  'poke-ball': 'Poké Ball Holo',
  'master-ball': 'Master Ball Holo',
  'stamp': 'Stamp Holo',
  'energy': 'Energy Holo',
  'secret-rare': 'Secret Rares',
};

interface VariantsAndOrderSelectorProps {
  /** All variants available for this set, in their default order */
  available: string[];
  /** Variants currently checked by the user */
  selected: string[];
  /** Full ordered list (includes both selected and unselected) */
  order: string[];
  onSelectedChange: (selected: string[]) => void;
  onOrderChange: (order: string[]) => void;
}

/**
 * Combined Variants + Display Order selector. Each row has:
 *  - Checkbox (toggle whether the variant is tracked)
 *  - Position number (only shown for selected variants)
 *  - Label
 *  - Up/down arrows to reorder
 *
 * Order applies to selected variants. Unselected rows can still be reordered
 * but won't appear in the binder.
 */
export default function VariantsAndOrderSelector({
  available,
  selected,
  order,
  onSelectedChange,
  onOrderChange,
}: VariantsAndOrderSelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Make sure the displayed order only includes available variants and includes
  // every available variant exactly once.
  const displayOrder = useMemo(() => {
    const kept = order.filter(k => available.includes(k));
    const missing = available.filter(k => !kept.includes(k));
    return [...kept, ...missing];
  }, [order, available]);

  const toggleVariant = (key: string) => {
    if (selected.includes(key)) {
      onSelectedChange(selected.filter(v => v !== key));
    } else {
      onSelectedChange([...selected, key]);
    }
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...displayOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onOrderChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= displayOrder.length - 1) return;
    const newOrder = [...displayOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onOrderChange(newOrder);
  };

  // Position number for each selected variant: 1, 2, 3 in display order
  const positionMap = useMemo(() => {
    const map = new Map<string, number>();
    let pos = 1;
    displayOrder.forEach(key => {
      if (selected.includes(key)) {
        map.set(key, pos++);
      }
    });
    return map;
  }, [displayOrder, selected]);

  return (
    <View>
      {displayOrder.map((key, index) => {
        const isSelected = selected.includes(key);
        const position = positionMap.get(key);
        const label = VARIANT_LABELS[key] || key;
        return (
          <View
            key={key}
            style={[styles.row, isSelected && styles.rowSelected]}
          >
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => toggleVariant(key)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={label}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
              </View>
              {isSelected ? (
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{position}</Text>
                </View>
              ) : (
                <View style={styles.positionPlaceholder} />
              )}
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {label}
              </Text>
            </TouchableOpacity>

            <View style={styles.arrows}>
              <TouchableOpacity
                onPress={() => moveUp(index)}
                disabled={index === 0}
                style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
                activeOpacity={0.6}
                accessibilityLabel={`Move ${label} up`}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={index === 0 ? colors.textLight : colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveDown(index)}
                disabled={index === displayOrder.length - 1}
                style={[styles.arrowButton, index === displayOrder.length - 1 && styles.arrowDisabled]}
                activeOpacity={0.6}
                accessibilityLabel={`Move ${label} down`}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={index === displayOrder.length - 1 ? colors.textLight : colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
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
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  rowMain: {
    flex: 1,
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
    marginRight: spacing.sm,
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  positionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  positionText: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
  positionPlaceholder: {
    width: 22,
    height: 22,
    marginRight: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  labelSelected: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  arrows: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
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
