import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';
import { getSetLogoByName } from '../../data/pokemonEras';
import { getPokemonImageUrl } from '../../services/api/pokemonApi';
import type { PokemonArtStyle } from '../../types';
import ProgressRing from '../Progress/ProgressRing';

interface HeaderBannerProps {
  collectionMode: 'master-set' | 'region' | 'custom';
  setName?: string;
  regionName?: string;
  pokemonArtStyle?: PokemonArtStyle;
  /** First card image URL for custom binder */
  cardThumbnail?: string;
  /** Completion percentage for progress ring */
  percentage: number;
}

const REGION_FIRST_DEX: Record<string, number> = {
  Kanto: 1, Johto: 152, Hoenn: 252, Sinnoh: 387,
  Unova: 494, Kalos: 650, Alola: 722, Galar: 810, Paldea: 906,
};

export default function HeaderBanner({
  collectionMode,
  setName,
  regionName,
  pokemonArtStyle,
  cardThumbnail,
  percentage,
}: HeaderBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ring = <ProgressRing percentage={percentage} size={44} strokeWidth={4} />;

  if (collectionMode === 'master-set' && setName) {
    const logoUrl = getSetLogoByName(setName);
    return (
      <View style={styles.bannerRow}>
        {logoUrl && (
          <Image
            source={{ uri: logoUrl }}
            style={styles.setLogo}
            contentFit="contain"
            contentPosition="left"
          />
        )}
        {ring}
      </View>
    );
  }

  if (collectionMode === 'region' && regionName) {
    const dex = REGION_FIRST_DEX[regionName];
    const artStyle = pokemonArtStyle || 'official-artwork';
    const spriteUrl = dex ? getPokemonImageUrl(dex, artStyle) : null;
    return (
      <View style={styles.bannerRow}>
        {spriteUrl && (
          <Image
            source={{ uri: spriteUrl }}
            style={styles.regionSprite}
            contentFit="contain"
          />
        )}
        {ring}
      </View>
    );
  }

  if (collectionMode === 'custom') {
    return (
      <View style={styles.bannerRow}>
        {cardThumbnail ? (
          <Image
            source={{ uri: cardThumbnail }}
            style={styles.customThumb}
            contentFit="contain"
          />
        ) : (
          <View style={styles.customEmpty}>
            <Ionicons name="grid-outline" size={22} color={colors.textTertiary} />
            <Text style={styles.customEmptyText}>Custom Collection</Text>
          </View>
        )}
        {ring}
      </View>
    );
  }

  return (
    <View style={styles.bannerRow}>
      {ring}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
      marginLeft: 40,
    },
    setLogo: {
      width: '60%',
      height: 44,
    },
    regionSprite: {
      width: 56,
      height: 56,
    },
    customThumb: {
      width: 48,
      height: 67,
      borderRadius: borderRadius.sm,
    },
    customEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    customEmptyText: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.textTertiary,
    },
  });
