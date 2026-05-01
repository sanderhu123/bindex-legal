import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fonts, spacing, typography, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import VariantsAndOrderSelector from '../../components/Binder/VariantsAndOrderSelector';
import { getAvailableVariantsForSet } from '../../data/cardVariants';
import { getCardsBySet, getSetTotalsInfo, isSetTotalsInfoCached } from '../../services/api/pokemonApi';
import { countCardsWithVariants } from '../../utils/cardCount';
import type { Card, VariantPlacement } from '../../types';

interface Step3VariantsProps {
  selectedSetId: string | null;
  selectedVariants: string[];
  variantOrder: string[];
  variantPlacement: VariantPlacement | null;
  onVariantsChange: (variants: string[]) => void;
  onOrderChange: (order: string[]) => void;
  onPlacementChange: (placement: VariantPlacement) => void;
  onCardCountChange?: (count: number | null) => void;
}

const HOLO_VARIANTS = ['reverse-holo', 'poke-ball', 'master-ball', 'stamp', 'energy'];

const PLACEMENT_OPTIONS: { value: VariantPlacement; label: string; description: string }[] = [
  { value: 'grouped', label: 'Grouped', description: 'After each card' },
  { value: 'end', label: 'At the End', description: 'All variants at the end' },
];

export default function Step3Variants({
  selectedSetId,
  selectedVariants,
  variantOrder,
  variantPlacement,
  onVariantsChange,
  onOrderChange,
  onPlacementChange,
  onCardCountChange,
}: Step3VariantsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [setCards, setSetCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [setTotalsReady, setSetTotalsReady] = useState(isSetTotalsInfoCached());

  // Make sure secret-rare info is loaded before computing available variants.
  useEffect(() => {
    if (setTotalsReady) return;
    let cancelled = false;
    getSetTotalsInfo()
      .then(() => { if (!cancelled) setSetTotalsReady(true); })
      .catch(() => { if (!cancelled) setSetTotalsReady(true); });
    return () => { cancelled = true; };
  }, [setTotalsReady]);

  const availableVariants = useMemo(() => {
    if (!selectedSetId) return ['base', 'reverse-holo'];
    return getAvailableVariantsForSet(selectedSetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetId, setTotalsReady]);

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

  // Push card count to parent so the layout step can use it
  useEffect(() => {
    onCardCountChange?.(dynamicCardCount);
  }, [dynamicCardCount]);

  // The placement toggle only matters when at least one HOLO variant is being
  // tracked (no holos = no in-card grouping decision to make).
  const hasHoloSelected = selectedVariants.some(v => HOLO_VARIANTS.includes(v));
  const showPlacementToggle = hasHoloSelected && selectedVariants.length > 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Variants & Display Order</Text>
      <Text style={styles.description}>
        Pick which versions to track. Drag using the arrows to set the order they appear in your binder.
      </Text>

      <VariantsAndOrderSelector
        available={availableVariants}
        selected={selectedVariants}
        order={variantOrder}
        onSelectedChange={onVariantsChange}
        onOrderChange={onOrderChange}
      />

      {/* Inline placement toggle (only relevant when holo variants are tracked) */}
      {showPlacementToggle && (
        <View style={styles.placementSection}>
          <Text style={styles.placementLabel}>Variant Placement</Text>
          <Text style={styles.placementHint}>
            How should the holo variants appear in your binder?
          </Text>
          <View style={styles.placementRow}>
            {PLACEMENT_OPTIONS.map((opt) => {
              const active = variantPlacement === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.placementButton, active && styles.placementButtonActive]}
                  onPress={() => onPlacementChange(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.placementButtonLabel, active && styles.placementButtonLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.placementButtonDesc, active && styles.placementButtonDescActive]}>
                    {opt.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

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
  placementSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  placementLabel: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  placementHint: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  placementRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  placementButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'flex-start',
  },
  placementButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  placementButtonLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  placementButtonLabelActive: {
    color: colors.primary,
  },
  placementButtonDesc: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
  placementButtonDescActive: {
    color: colors.primary,
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
