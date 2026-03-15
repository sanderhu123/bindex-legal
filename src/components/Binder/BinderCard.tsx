import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const MODE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'master-set': 'book-outline',
  'region': 'map-outline',
  'custom': 'grid-outline',
};

export default function BinderCard({ binder, completionPercentage, totalCards, onPress, onDelete }: BinderCardProps) {
  const [symbolError, setSymbolError] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const subtitle = getSubtitle();
  const showSetSymbol = binder.collectionMode === 'master-set' && setSymbolUrl && !symbolError;
  const modeIcon = MODE_ICONS[binder.collectionMode] || 'grid-outline';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onLongPress={onDelete}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        delayLongPress={600}
      >
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
            <View style={styles.subtitleRow}>
              <Ionicons name={modeIcon} size={13} color={colors.textTertiary} style={styles.modeIcon} />
              <Text style={styles.subtitle} numberOfLines={1}>
                {getCollectionModeLabel(binder.collectionMode)}
                {subtitle && ` · ${subtitle}`}
              </Text>
            </View>
          </View>

          <ProgressBar
            current={binder.ownedCards}
            total={totalCards}
            percentage={completionPercentage}
            format="full"
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
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
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIcon: {
    marginRight: 4,
  },
  subtitle: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    flex: 1,
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
