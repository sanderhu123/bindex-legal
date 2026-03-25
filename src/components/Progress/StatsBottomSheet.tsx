import React, { useMemo } from 'react';
import {
  View,
  Text,
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

const MILESTONES = [25, 50, 75, 100] as const;

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

const SHORT_LABELS: Record<string, string> = {
  'common': 'Common',
  'uncommon': 'Uncommon',
  'rare': 'Rare',
  'holo rare': 'Holo Rare',
  'rare holo': 'Holo Rare',
  'double rare': 'Double Rare',
  'ultra rare': 'Ultra Rare',
  'illustration rare': 'Illustration Rare',
  'special illustration rare': 'Special IR',
  'hyper rare': 'Hyper Rare',
  'shiny rare': 'Shiny Rare',
  'shiny ultra rare': 'Shiny Ultra',
  'ace spec rare': 'ACE Spec',
};

interface RarityGroup {
  rarity: string;
  label: string;
  owned: number;
  total: number;
  percentage: number;
}

interface StatsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  ownedCount: number;
  totalCount: number;
  missingCount: number;
  progressPercentage: number;
  cards: { rarity: string; isOwned: boolean }[];
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
  customSlotInfo,
}: StatsBottomSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        label: SHORT_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
        owned,
        total,
        percentage: total > 0 ? Math.round((owned / total) * 100) : 0,
      });
    }

    return result;
  }, [cards]);

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
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Binder Statistics</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {/* Overall Progress */}
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

            {/* Milestones */}
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

            {/* Rarity Breakdown */}
            {rarityGroups.length > 0 && (
              <View style={styles.raritySection}>
                <Text style={styles.sectionTitle}>Rarity Breakdown</Text>
                {rarityGroups.map((group) => (
                  <View key={group.rarity} style={styles.rarityRow}>
                    <View style={styles.rarityContent}>
                      <Text style={styles.rarityLabel}>
                        <Text style={styles.rarityCount}>{group.owned}/{group.total}</Text>
                        {'  '}{group.label}
                      </Text>
                      <View style={styles.rarityBarTrack}>
                        <View
                          style={[
                            styles.rarityBarFill,
                            {
                              width: `${group.percentage}%`,
                              backgroundColor: group.percentage === 100 ? colors.success : colors.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={styles.rarityPercent}>{group.percentage}%</Text>
                  </View>
                ))}
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
      marginBottom: spacing.md,
    },
    headerTitle: {
      fontSize: typography.lg,
      fontFamily: fonts.semibold,
      color: colors.text,
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
    raritySection: {
      gap: spacing.md,
    },
    rarityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      gap: spacing.sm,
    },
    rarityContent: {
      flex: 1,
      gap: 2,
    },
    rarityLabel: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.text,
    },
    rarityCount: {
      fontFamily: fonts.semibold,
      color: colors.textSecondary,
    },
    rarityBarTrack: {
      height: 6,
      backgroundColor: colors.backgroundDark,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    rarityBarFill: {
      height: '100%',
      borderRadius: borderRadius.full,
    },
    rarityPercent: {
      fontSize: typography.xl,
      fontFamily: fonts.bold,
      color: colors.text,
      minWidth: 48,
      textAlign: 'right',
    },
  });
