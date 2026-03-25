import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, type ThemeColors } from '../../constants/theme';
import ProgressRing from './ProgressRing';

interface RarityStatsProps {
  cards: { rarity: string; isOwned: boolean }[];
  isRegionMode?: boolean;
}

const RARITY_ORDER: string[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Holo Rare',
  'Rare Holo',
  'Double Rare',
  'Ultra Rare',
  'Illustration Rare',
  'Special Illustration Rare',
  'Hyper Rare',
  'Shiny Rare',
  'Shiny Ultra Rare',
  'ACE SPEC Rare',
];

const SHORT_LABELS: Record<string, string> = {
  'Common': 'Common',
  'Uncommon': 'Uncom.',
  'Rare': 'Rare',
  'Holo Rare': 'Holo',
  'Rare Holo': 'Holo',
  'Double Rare': 'Dbl Rare',
  'Ultra Rare': 'Ultra',
  'Illustration Rare': 'IR',
  'Special Illustration Rare': 'SIR',
  'Hyper Rare': 'Hyper',
  'Shiny Rare': 'Shiny',
  'Shiny Ultra Rare': 'Shiny U',
  'ACE SPEC Rare': 'ACE',
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

      const existing = map.get(rarity);
      if (existing) {
        existing.total += 1;
        if (card.isOwned) existing.owned += 1;
      } else {
        map.set(rarity, { total: 1, owned: card.isOwned ? 1 : 0 });
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
