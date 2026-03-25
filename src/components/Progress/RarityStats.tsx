import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, type ThemeColors } from '../../constants/theme';
import ProgressRing from './ProgressRing';

interface RarityStatsProps {
  cards: { rarity: string; isOwned: boolean }[];
  isRegionMode?: boolean;
}

/** Ordering uses lowercase keys so API casing differences don't matter */
const RARITY_ORDER: string[] = [
  'common',
  'uncommon',
  'rare',
  'holo rare',
  'rare holo',
  'double rare',
  'ultra rare',
  'illustration rare',
  'special illustration rare',
  'hyper rare',
  'shiny rare',
  'shiny ultra rare',
  'ace spec rare',
];

/** Short display labels — lowercase keys for case-insensitive matching */
const SHORT_LABELS: Record<string, string> = {
  'common': 'Common',
  'uncommon': 'Uncom.',
  'rare': 'Rare',
  'holo rare': 'Holo',
  'rare holo': 'Holo',
  'double rare': 'Dbl Rare',
  'ultra rare': 'Ultra',
  'illustration rare': 'IR',
  'special illustration rare': 'SIR',
  'hyper rare': 'Hyper',
  'shiny rare': 'Shiny',
  'shiny ultra rare': 'Shiny U',
  'ace spec rare': 'ACE',
};

interface RarityGroup {
  rarity: string;
  label: string;
  owned: number;
  total: number;
}

const RING_SIZE = 36;

export default function RarityStats({ cards }: RarityStatsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const groups = useMemo(() => {
    const map = new Map<string, { owned: number; total: number }>();

    for (const card of cards) {
      const rarity = card.rarity || '';
      if (!rarity) continue;

      // Normalize to lowercase for grouping so "Double rare" and "Double Rare" merge
      const key = rarity.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.total += 1;
        if (card.isOwned) existing.owned += 1;
      } else {
        map.set(key, { total: 1, owned: card.isOwned ? 1 : 0 });
      }
    }

    const result: RarityGroup[] = [];
    const orderIndex = (r: string) => {
      const idx = RARITY_ORDER.indexOf(r);
      return idx >= 0 ? idx : RARITY_ORDER.length;
    };

    const sortedKeys = [...map.keys()].sort((a, b) => orderIndex(a) - orderIndex(b));

    for (const key of sortedKeys) {
      const { owned, total } = map.get(key)!;
      result.push({
        rarity: key,
        label: SHORT_LABELS[key] || key,
        owned,
        total,
      });
    }

    return result;
  }, [cards]);

  if (groups.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {groups.map((group) => {
        const pct = group.total > 0 ? Math.round((group.owned / group.total) * 100) : 0;
        return (
          <View key={group.rarity} style={styles.ringItem}>
            <ProgressRing
              percentage={pct}
              size={RING_SIZE}
              strokeWidth={3}
              label={`${group.owned}/${group.total}`}
            />
            <Text style={styles.ringLabel} numberOfLines={1}>{group.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.sm,
    },
    contentContainer: {
      gap: spacing.md,
      paddingHorizontal: 1,
    },
    ringItem: {
      alignItems: 'center',
      gap: 2,
    },
    ringLabel: {
      fontSize: 10,
      fontFamily: fonts.regular,
      color: colors.textTertiary,
    },
  });
