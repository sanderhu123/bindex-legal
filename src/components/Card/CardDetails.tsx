import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { Card } from '../../types';

interface CardDetailsProps {
  card: Card;
  variant?: 'compact' | 'full';
  showSet?: boolean;
  showRarity?: boolean;
  showArtist?: boolean;
  showVariantBadge?: boolean;
  showPokedex?: boolean;
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
 * - Name, number, set, rarity, artist
 * - Variant badge display
 * - Compact or full display mode
 */
export default function CardDetails({
  card,
  variant = 'compact',
  showSet = true,
  showRarity = true,
  showArtist = true,
  showVariantBadge = true,
  showPokedex = true,
}: CardDetailsProps) {
  const badge = showVariantBadge ? getVariantBadge(card.variant) : null;

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

  // Full variant
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
      <Text style={styles.fullNumber}>{card.number}</Text>
      {showSet && (
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Set:</Text>
          <Text style={styles.fullValue}>{card.set}</Text>
        </View>
      )}
      {showRarity && (
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Rarity:</Text>
          <Text style={styles.fullValue}>{card.rarity}</Text>
        </View>
      )}
      {showArtist && (
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Artist:</Text>
          <Text style={styles.fullValue}>{card.artist}</Text>
        </View>
      )}
      {showPokedex && card.pokedexNumber && (
        <View style={styles.fullRow}>
          <Text style={styles.fullLabel}>Pokédex:</Text>
          <Text style={styles.fullValue}>#{card.pokedexNumber}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: '#333',
    fontWeight: '500',
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
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    includeFontPadding: false,
  },
  compactNumber: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  compactSet: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    marginTop: 1,
  },
  // Full variant styles (for detail screens)
  fullContainer: {
    padding: 12,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fullName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  fullBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  fullNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  fullRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  fullLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    width: 70,
  },
  fullValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

