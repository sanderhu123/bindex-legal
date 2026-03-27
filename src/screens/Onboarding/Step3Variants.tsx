import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { fonts, spacing, typography, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import VariantSelector from '../../components/Binder/VariantSelector';
import { getAvailableVariantsForSet } from '../../data/cardVariants';
import { getCardsBySet } from '../../services/api/pokemonApi';
import { countCardsWithVariants } from '../../utils/cardCount';
import type { Card } from '../../types';

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

  const [setCards, setSetCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const availableVariants = selectedSetId 
    ? getAvailableVariantsForSet(selectedSetId)
    : ['base', 'reverse-holo'];

  // Fetch all cards for the selected set so we can compute dynamic counts
  useEffect(() => {
    if (!selectedSetId) return;

    let cancelled = false;
    setLoadingCards(true);

    getCardsBySet(selectedSetId)
      .then(cards => {
        if (!cancelled) setSetCards(cards);
      })
      .catch(err => {
        console.error('[Step3Variants] Failed to fetch cards for count:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingCards(false);
      });

    return () => { cancelled = true; };
  }, [selectedSetId]);

  // Compute dynamic card count based on currently selected variants
  const dynamicCardCount = useMemo(() => {
    if (setCards.length === 0) return null;
    return countCardsWithVariants(setCards, selectedVariants);
  }, [setCards, selectedVariants]);

  console.log('[Step3Variants] ===== VARIANT SELECTION =====');
  console.log('[Step3Variants] Selected Set ID:', selectedSetId);
  console.log('[Step3Variants] Available Variants:', availableVariants);
  console.log('[Step3Variants] Currently Selected:', selectedVariants);
  console.log('[Step3Variants] Dynamic card count:', dynamicCardCount);
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

      {/* Dynamic card count based on variant selection */}
      <View style={styles.cardCountContainer}>
        {loadingCards ? (
          <View style={styles.cardCountLoading}>
            <ActivityIndicator size="small" color={colors.textTertiary} />
            <Text style={styles.cardCountLoadingText}>Calculating cards...</Text>
          </View>
        ) : dynamicCardCount !== null ? (
          <Text style={styles.cardCountText}>
            Your binder will have {dynamicCardCount} cards
          </Text>
        ) : null}
      </View>
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
  cardCountContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cardCountText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  cardCountLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardCountLoadingText: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
});
