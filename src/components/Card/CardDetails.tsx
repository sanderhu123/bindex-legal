import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography, borderRadius, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { getSetSymbolByName } from '../../data/pokemonEras';
import type { Card } from '../../types';

interface CardDetailsProps {
  card: Card;
  variant?: 'compact' | 'full';
  showSet?: boolean;
  showRarity?: boolean;
  showIllustrator?: boolean;
  showVariantBadge?: boolean;
  showPokedex?: boolean;
  binderPosition?: { page: number; slot: number } | null;
}

/**
 * Helper function to get variant badge info
 */
function getVariantBadge(variant?: string) {
  if (!variant || variant === 'base') return null;
  const badges: Record<string, { label: string; color: string }> = {
    'reverse-holo': { label: 'RH', color: '#FFD700' }, // Gold
    'poke-ball': { label: 'PB', color: '#FF6B6B' }, // Red
    'master-ball': { label: 'MB', color: '#4ECDC4' }, // Teal
  };
  return badges[variant] || null;
}

/**
 * CardDetails component for displaying card information
 * Features:
 * - Name, number, set, rarity, illustrator
 * - Variant badge display
 * - Compact or full display mode
 */
export default function CardDetails({
  card,
  variant = 'compact',
  showSet = true,
  showRarity = true,
  showIllustrator = true,
  showVariantBadge = true,
  showPokedex = true,
  binderPosition,
}: CardDetailsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const badge = showVariantBadge ? getVariantBadge(card.variant) : null;
  const [symbolError, setSymbolError] = useState(false);
  const setSymbolUrl = card.set ? getSetSymbolByName(card.set) : null;

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactName} numberOfLines={1}>
            {card.name}
          </Text>
          {badge && (
            <View style={[styles.compactBadge, { backgroundColor: badge.color }]}>
              <Text style={styles.compactBadgeText}>{badge.label}</Text>
            </View>
          )}
        </View>
        <Text style={styles.compactNumber}>{card.number}</Text>
        {showSet && <Text style={styles.compactSet}>{card.set}</Text>}
      </View>
    );
  }

  // Full variant - build info rows dynamically
  const infoRows: { icon: string; label: string; value: string }[] = [];
  if (card.supertype) infoRows.push({ icon: 'albums-outline', label: 'Type', value: card.supertype });
  if (showSet && card.set) infoRows.push({ icon: 'layers-outline', label: 'Set', value: card.set });
  if (showRarity && card.rarity) infoRows.push({ icon: 'diamond-outline', label: 'Rarity', value: card.rarity });
  if (showIllustrator && card.illustrator) infoRows.push({ icon: 'brush-outline', label: 'Illustrator', value: card.illustrator });
  if (showPokedex && card.pokedexNumber) infoRows.push({ icon: 'list-outline', label: 'Pokédex', value: `#${card.pokedexNumber}` });

  return (
    <View style={styles.fullContainer}>
      <View style={styles.fullHeader}>
        <Text style={styles.fullName}>{card.name}</Text>
        {badge && (
          <View style={[styles.fullBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.fullBadgeText}>{badge.label}</Text>
          </View>
        )}
      </View>
      <View style={styles.fullNumberRow}>
        <View style={styles.fullNumberPill}>
          <Text style={styles.fullNumber}>
            {card.setTotal ? `${card.number}/${card.setTotal}` : card.number}
          </Text>
        </View>
        {binderPosition && (
          <View style={styles.fullPositionPill}>
            <Ionicons name="location-outline" size={12} color={colors.textTertiary} style={{ marginRight: 3 }} />
            <Text style={styles.fullPositionText}>
              Page {binderPosition.page}, Slot {binderPosition.slot}
            </Text>
          </View>
        )}
      </View>
      {infoRows.map((row, index) => (
        <React.Fragment key={row.label}>
          {index > 0 && <View style={styles.fullDivider} />}
          <View style={styles.fullRow}>
            <Ionicons name={row.icon as any} size={16} color={colors.textTertiary} style={styles.fullRowIcon} />
            <Text style={styles.fullLabel}>{row.label}</Text>
            {row.label === 'Set' && setSymbolUrl && !symbolError ? (
              <View style={styles.setValueRow}>
                <Text style={styles.fullValueInline} numberOfLines={1}>{row.value}</Text>
                <Image
                  source={{ uri: setSymbolUrl }}
                  style={styles.setSymbol}
                  resizeMode="contain"
                  onError={() => setSymbolError(true)}
                />
              </View>
            ) : (
              <Text style={styles.fullValue} numberOfLines={1}>{row.value}</Text>
            )}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Compact variant styles (for grid/list items)
  compactContainer: {
    alignItems: 'center',
    width: '100%',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 2,
  },
  compactName: {
    fontSize: 12,
    color: colors.text,
    fontFamily: fonts.medium,
    textAlign: 'center',
    flex: 1,
  },
  compactBadge: {
    marginLeft: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBadgeText: {
    fontSize: 8,
    fontFamily: fonts.bold,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    includeFontPadding: false,
  },
  compactNumber: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  compactSet: {
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 1,
  },
  // Full variant styles (for detail screens)
  fullContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fullName: {
    fontSize: typography['2xl'],
    fontFamily: fonts.semibold,
    color: colors.text,
    flex: 1,
    letterSpacing: -0.3,
  },
  fullBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  fullNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  fullNumberPill: {
    backgroundColor: colors.backgroundDark,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  fullPositionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  fullPositionText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontFamily: fonts.medium,
  },
  fullNumber: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  fullDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  fullRowIcon: {
    marginRight: spacing.sm,
    width: 20,
  },
  fullLabel: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontFamily: fonts.medium,
    width: 85,
  },
  fullValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontFamily: fonts.regular,
    flex: 1,
  },
  setValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fullValueInline: {
    fontSize: typography.sm,
    color: colors.text,
    fontFamily: fonts.regular,
    flexShrink: 1,
  },
  setSymbol: {
    width: 16,
    height: 16,
    marginLeft: 4,
  },
});

