import React, { useMemo } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { fonts, spacing, typography, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { VariantPlacement } from '../../types';
import VariantOrderSelector from '../../components/Binder/VariantOrderSelector';
import { getAvailableVariantsForSet } from '../../data/cardVariants';

interface StepDisplayOrderProps {
  variantPlacement: VariantPlacement | null;
  variantOrder: string[];
  onOrderChange: (order: string[]) => void;
  selectedSetId?: string | null;
}

export default function StepDisplayOrder({
  variantPlacement,
  variantOrder,
  onOrderChange,
  selectedSetId,
}: StepDisplayOrderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Only show variants that the selected set actually supports
  const availableForSetArr = selectedSetId ? getAvailableVariantsForSet(selectedSetId) : [];
  const setHasSecretRares = availableForSetArr.includes('secret-rare' as any);
  const availableForSet = selectedSetId
    ? new Set([...availableForSetArr, 'main-set'])
    : null;

  const filteredOrder = availableForSet
    ? variantOrder.filter(k => availableForSet.has(k))
    : variantOrder;

  const groupedOrder = filteredOrder.length > 0 && filteredOrder[0] === 'secret-rare'
    ? ['secret-rare', 'main-set']
    : ['main-set', 'secret-rare'];

  const handleGroupedOrderChange = (newOrder: string[]) => {
    const rest = variantOrder.filter(k => k !== 'secret-rare');
    if (newOrder[0] === 'secret-rare') {
      onOrderChange(['secret-rare', ...rest]);
    } else {
      onOrderChange([...rest, 'secret-rare']);
    }
  };

  if (variantPlacement === 'grouped') {
    // Grouped placement only has something to order if the set has secret rares
    // (position relative to the main set). Without secret rares, variants are
    // auto-grouped after each card and there's nothing for the user to choose.
    if (!setHasSecretRares) return null;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Display Order</Text>
        <Text style={styles.description}>
          Show secret rares before or after the main set cards.
        </Text>
        <VariantOrderSelector order={groupedOrder} onChange={handleGroupedOrderChange} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Display Order</Text>
      <Text style={styles.description}>
        Set the order in which card groups appear in your binder. Use the arrows to rearrange.
      </Text>
      <VariantOrderSelector order={filteredOrder} onChange={onOrderChange} />
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
