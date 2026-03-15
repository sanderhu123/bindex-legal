import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import type { Binder } from '../../types';
import ProgressBar from '../Progress/ProgressBar';
import { getSetLogoByName } from '../../data/pokemonEras';
import { colors, fonts, typography, spacing, borderRadius, shadows } from '../../constants/theme';

interface BinderCardProps {
  binder: Binder;
  completionPercentage: number;
  totalCards: number;
  onPress: () => void;
  onDelete?: () => void;
}

export default function BinderCard({ binder, completionPercentage, totalCards, onPress, onDelete }: BinderCardProps) {
  const [logoError, setLogoError] = useState(false);

  const setLogoUrl = binder.collectionMode === 'master-set' && binder.set
    ? getSetLogoByName(binder.set)
    : null;

  const getCollectionModeLabel = (mode: string): string => {
    switch (mode) {
      case 'master-set':
        return 'Master Set';
      case 'region':
        return 'Region';
      case 'custom':
        return 'Custom';
      default:
        return mode;
    }
  };

  const getSubtitle = (): string => {
    if (binder.collectionMode === 'master-set' && binder.set) {
      return binder.set;
    } else if (binder.collectionMode === 'region' && binder.region) {
      return `${binder.region} Region`;
    } else if (binder.collectionMode === 'custom') {
      return 'Custom Collection';
    }
    return '';
  };

  const subtitle = getSubtitle();
  const displayPercentage = Math.min(100, Math.max(0, Math.round(completionPercentage)));

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.7}
      delayLongPress={600}
    >
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={1}>
              {binder.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {getCollectionModeLabel(binder.collectionMode)}
              {subtitle && ` · ${subtitle}`}
            </Text>
          </View>
          <Text style={styles.percentage}>{displayPercentage}%</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.progressArea}>
            <ProgressBar
              current={binder.ownedCards}
              total={totalCards}
              percentage={completionPercentage}
              format="ratio"
            />
          </View>
          {binder.collectionMode === 'master-set' && setLogoUrl && !logoError && (
            <Image
              source={{ uri: setLogoUrl }}
              style={styles.setLogo}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  accentBar: {
    width: 4,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleArea: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
  percentage: {
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressArea: {
    flex: 1,
  },
  setLogo: {
    width: 90,
    height: 26,
    marginLeft: spacing.md,
  },
});
