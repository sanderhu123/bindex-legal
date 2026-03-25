import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';
import ProgressRing from './ProgressRing';
import { getSetSymbolByName } from '../../data/pokemonEras';

const MILESTONES = [25, 50, 75, 100] as const;

type StatsTab = 'rarity' | 'sets' | 'variant';

export const RARITY_ORDER: string[] = [
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

export const RARITY_LABELS: Record<string, string> = {
  'common': 'Common',
  'uncommon': 'Uncommon',
  'rare': 'Rare',
  'holo rare': 'Holo Rare',
  'rare holo': 'Holo Rare',
  'double rare': 'Double Rare',
  'ultra rare': 'Ultra Rare',
  'illustration rare': 'Illustration Rare',
  'special illustration rare': 'Special Illustration Rare',
  'hyper rare': 'Hyper Rare',
  'shiny rare': 'Shiny Rare',
  'shiny ultra rare': 'Shiny Ultra Rare',
  'ace spec rare': 'ACE Spec Rare',
};

interface RarityGroup {
  rarity: string;
  label: string;
  owned: number;
  total: number;
  percentage: number;
}

interface SetGroup {
  name: string;
  owned: number;
  total: number;
  percentage: number;
}

interface VariantGroup {
  variant: string;
  label: string;
  owned: number;
  total: number;
  percentage: number;
}

export const VARIANT_ORDER: string[] = [
  'base',
  'holo',
  'reverse-holo',
  'poke-ball',
  'master-ball',
  'secret-rare',
];

export const VARIANT_LABELS: Record<string, string> = {
  'base': 'Regular',
  'holo': 'Holo',
  'reverse-holo': 'Reverse Holo',
  'poke-ball': 'Poké Ball Holo',
  'master-ball': 'Master Ball Holo',
  'secret-rare': 'Hits',
};

const REGULAR_RARITIES = new Set([
  'common',
  'uncommon',
  'rare',
  'holo rare',
  'rare holo',
]);

export interface StatsFilter {
  type: 'rarity' | 'set' | 'variant';
  value: string;
  label: string;
}

interface StatsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  ownedCount: number;
  totalCount: number;
  missingCount: number;
  progressPercentage: number;
  cards: { rarity: string; set: string; variant?: string; isOwned: boolean }[];
  onDrillDown?: (filter: StatsFilter) => void;
  customSlotInfo?: { filled: number; max: number };
}

export default function StatsBottomSheet({
  visible,
  onClose,
  ownedCount,
  totalCount,
  missingCount,
  progressPercentage,
  cards,
  onDrillDown,
  customSlotInfo,
}: StatsBottomSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<StatsTab>('rarity');

  const reachedMilestones = MILESTONES.filter((m) => progressPercentage >= m);

  const rarityGroups = useMemo(() => {
    const map = new Map<string, { owned: number; total: number }>();

    for (const card of cards) {
      const rarity = card.rarity || '';
      if (!rarity) continue;
      const key = rarity.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.total += 1;
        if (card.isOwned) existing.owned += 1;
      } else {
        map.set(key, { total: 1, owned: card.isOwned ? 1 : 0 });
      }
    }

    const orderIndex = (r: string) => {
      const idx = RARITY_ORDER.indexOf(r);
      return idx >= 0 ? idx : RARITY_ORDER.length;
    };

    const sortedKeys = [...map.keys()].sort((a, b) => orderIndex(a) - orderIndex(b));
    const result: RarityGroup[] = [];

    for (const key of sortedKeys) {
      const { owned, total } = map.get(key)!;
      result.push({
        rarity: key,
        label: RARITY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
        owned,
        total,
        percentage: total > 0 ? Math.round((owned / total) * 100) : 0,
      });
    }

    return result;
  }, [cards]);

  const setGroups = useMemo(() => {
    const map = new Map<string, { owned: number; total: number }>();

    for (const card of cards) {
      const rawSet = card.set || '';
      if (!rawSet) continue;
      const set = rawSet.startsWith('Custom|') ? 'Custom Cards' : rawSet;
      const existing = map.get(set);
      if (existing) {
        existing.total += 1;
        if (card.isOwned) existing.owned += 1;
      } else {
        map.set(set, { total: 1, owned: card.isOwned ? 1 : 0 });
      }
    }

    return [...map.entries()]
      .map(([name, { owned, total }]) => ({
        name,
        owned,
        total,
        percentage: total > 0 ? Math.round((owned / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [cards]);

  const variantGroups = useMemo(() => {
    const map = new Map<string, { owned: number; total: number }>();

    for (const card of cards) {
      let variant = card.variant || 'base';
      if (variant === 'base' && card.rarity && !REGULAR_RARITIES.has(card.rarity.toLowerCase())) {
        variant = 'secret-rare';
      }
      const existing = map.get(variant);
      if (existing) {
        existing.total += 1;
        if (card.isOwned) existing.owned += 1;
      } else {
        map.set(variant, { total: 1, owned: card.isOwned ? 1 : 0 });
      }
    }

    const orderIndex = (v: string) => {
      const idx = VARIANT_ORDER.indexOf(v);
      return idx >= 0 ? idx : VARIANT_ORDER.length;
    };

    const sortedKeys = [...map.keys()].sort((a, b) => orderIndex(a) - orderIndex(b));
    const result: VariantGroup[] = [];

    for (const key of sortedKeys) {
      const { owned, total } = map.get(key)!;
      result.push({
        variant: key,
        label: VARIANT_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
        owned,
        total,
        percentage: total > 0 ? Math.round((owned / total) * 100) : 0,
      });
    }

    return result;
  }, [cards]);

  const tabs: { key: StatsTab; label: string }[] = [
    { key: 'rarity', label: 'Rarity' },
    { key: 'sets', label: 'Sets' },
    { key: 'variant', label: 'Variant' },
  ];

  const handleRowTap = (filter: StatsFilter) => {
    if (!onDrillDown) return;
    onClose();
    onDrillDown(filter);
  };

  const renderBreakdownRow = (
    key: string,
    label: string,
    owned: number,
    total: number,
    percentage: number,
    onTap?: () => void,
  ) => (
    <TouchableOpacity
      key={key}
      style={styles.breakdownRow}
      activeOpacity={onTap ? 0.7 : 1}
      onPress={onTap}
    >
      <View style={styles.breakdownContent}>
        <View style={styles.breakdownLabelRow}>
          <Text style={styles.breakdownLabel}>
            <Text style={styles.breakdownCount}>{owned}/{total}</Text>
            {'  '}{label}
          </Text>
          {onTap && (
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          )}
        </View>
        <View style={styles.breakdownBarTrack}>
          <View
            style={[
              styles.breakdownBarFill,
              {
                width: `${percentage}%`,
                backgroundColor: percentage === 100 ? colors.success : colors.primary,
              },
            ]}
          />
        </View>
      </View>
      <Text style={styles.breakdownPercent}>{percentage}%</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Binder Statistics</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.overallSection}>
              <ProgressRing percentage={progressPercentage} size={80} strokeWidth={6} />
              <View style={styles.overallStats}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{totalCount}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Owned</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{ownedCount}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Missing</Text>
                  <Text style={[styles.statValue, { color: colors.textTertiary }]}>{missingCount}</Text>
                </View>
                {customSlotInfo && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Slots</Text>
                    <Text style={styles.statValue}>{customSlotInfo.filled}/{customSlotInfo.max}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.milestonesSection}>
              <Text style={styles.sectionTitle}>Milestones</Text>
              <View style={styles.milestonesRow}>
                {MILESTONES.map((milestone) => {
                  const reached = reachedMilestones.includes(milestone);
                  return (
                    <View
                      key={milestone}
                      style={[styles.milestoneBadge, reached && styles.milestoneBadgeReached]}
                    >
                      {reached && (
                        <Ionicons name="checkmark" size={12} color={colors.primary} style={{ marginRight: 2 }} />
                      )}
                      <Text style={[styles.milestoneBadgeText, reached && styles.milestoneBadgeTextReached]}>
                        {milestone}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.tabBar}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Rarity Tab */}
            {activeTab === 'rarity' && rarityGroups.length > 0 && (
              <View style={styles.breakdownSection}>
                {rarityGroups.map((group) =>
                  renderBreakdownRow(
                    group.rarity, group.label, group.owned, group.total, group.percentage,
                    onDrillDown ? () => handleRowTap({ type: 'rarity', value: group.rarity, label: group.label }) : undefined,
                  )
                )}
              </View>
            )}

            {/* Sets Tab */}
            {activeTab === 'sets' && setGroups.length > 0 && (
              <View style={styles.breakdownSection}>
                {setGroups.map((group) => {
                  const symbolUrl = getSetSymbolByName(group.name);
                  const onTap = onDrillDown
                    ? () => handleRowTap({ type: 'set', value: group.name, label: group.name })
                    : undefined;
                  return (
                    <TouchableOpacity
                      key={group.name}
                      style={styles.breakdownRow}
                      activeOpacity={onTap ? 0.7 : 1}
                      onPress={onTap}
                    >
                      <View style={styles.breakdownContent}>
                        <View style={styles.setLabelRow}>
                          <Text style={styles.breakdownLabel}>
                            <Text style={styles.breakdownCount}>{group.owned}/{group.total}</Text>
                            {'  '}{group.name}
                          </Text>
                          <View style={styles.setLabelRight}>
                            {symbolUrl && (
                              <Image
                                source={{ uri: symbolUrl }}
                                style={styles.setSymbol}
                                resizeMode="contain"
                              />
                            )}
                            {onTap && (
                              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                            )}
                          </View>
                        </View>
                        <View style={styles.breakdownBarTrack}>
                          <View
                            style={[
                              styles.breakdownBarFill,
                              {
                                width: `${group.percentage}%`,
                                backgroundColor: group.percentage === 100 ? colors.success : colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.breakdownPercent}>{group.percentage}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Variant Tab */}
            {activeTab === 'variant' && variantGroups.length > 0 && (
              <View style={styles.breakdownSection}>
                {variantGroups.map((group) =>
                  renderBreakdownRow(
                    group.variant, group.label, group.owned, group.total, group.percentage,
                    onDrillDown ? () => handleRowTap({ type: 'variant', value: group.variant, label: group.label }) : undefined,
                  )
                )}
              </View>
            )}

            <View style={{ height: spacing.lg }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      maxHeight: Dimensions.get('window').height * 0.75,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    handleRow: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    headerTitle: {
      fontSize: typography.lg,
      fontFamily: fonts.semibold,
      color: colors.text,
    },
    tabBar: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: colors.backgroundDark,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.onPrimary,
      fontFamily: fonts.semibold,
    },
    scrollContent: {
      flexGrow: 0,
    },
    overallSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    overallStats: {
      flex: 1,
      gap: spacing.xs,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statLabel: {
      fontSize: typography.sm,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: typography.sm,
      fontFamily: fonts.semibold,
      color: colors.text,
    },
    milestonesSection: {
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.sm,
      fontFamily: fonts.semibold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    milestonesRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    milestoneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.backgroundDark,
      borderWidth: 1,
      borderColor: colors.border + '55',
    },
    milestoneBadgeReached: {
      borderColor: colors.primary + '40',
      backgroundColor: colors.primary + '10',
    },
    milestoneBadgeText: {
      fontSize: typography.xs,
      fontFamily: fonts.medium,
      color: colors.textTertiary,
    },
    milestoneBadgeTextReached: {
      color: colors.primary,
      fontFamily: fonts.semibold,
    },
    breakdownSection: {
      gap: spacing.sm,
    },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    breakdownContent: {
      flex: 1,
      gap: 0,
    },
    breakdownLabelRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    setLabelRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    setLabelRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.xs,
    },
    setSymbol: {
      width: 20,
      height: 20,
    },
    breakdownLabel: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.text,
      flexShrink: 1,
    },
    breakdownCount: {
      fontFamily: fonts.semibold,
      color: colors.textSecondary,
    },
    breakdownBarTrack: {
      height: 6,
      backgroundColor: colors.backgroundDark,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    breakdownBarFill: {
      height: '100%',
      borderRadius: borderRadius.full,
    },
    breakdownPercent: {
      fontSize: typography.xl,
      fontFamily: fonts.bold,
      color: colors.text,
      minWidth: 48,
      textAlign: 'right',
    },
  });
