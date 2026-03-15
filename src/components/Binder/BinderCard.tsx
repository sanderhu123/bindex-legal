import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import type { Binder } from '../../types';
import ProgressBar from '../Progress/ProgressBar';
import { getSetSymbolByName } from '../../data/pokemonEras';
import { colors, fonts, typography, spacing, borderRadius, shadows } from '../../constants/theme';

interface BinderCardProps {
  binder: Binder;
  completionPercentage: number;
  totalCards: number;
  onPress: () => void;
  onDelete?: () => void;
}

export default function BinderCard({ binder, completionPercentage, totalCards, onPress, onDelete }: BinderCardProps) {
  const [symbolError, setSymbolError] = useState(false);

  const setSymbolUrl = binder.collectionMode === 'master-set' && binder.set
    ? getSetSymbolByName(binder.set)
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
  const showSetSymbol = binder.collectionMode === 'master-set' && setSymbolUrl && !symbolError;

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
        {showSetSymbol && (
          <Image
            source={{ uri: setSymbolUrl }}
            style={styles.setSymbol}
            resizeMode="contain"
            onError={() => setSymbolError(true)}
          />
        )}
        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={1}>
            {binder.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {getCollectionModeLabel(binder.collectionMode)}
            {subtitle && ` · ${subtitle}`}
          </Text>
        </View>

        <ProgressBar
          current={binder.ownedCards}
          total={totalCards}
          percentage={completionPercentage}
          format="full"
        />
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
  titleArea: {
    marginBottom: spacing.sm,
    paddingRight: 28,
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
  setSymbol: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 20,
    height: 20,
    opacity: 0.6,
  },
});
