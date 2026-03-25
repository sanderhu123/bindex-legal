import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';
import { getSetLogoByName } from '../../data/pokemonEras';

interface HeaderBannerProps {
  collectionMode: 'master-set' | 'region' | 'custom';
  setName?: string;
  regionName?: string;
  /** First few card image URLs for custom binder mosaic */
  cardThumbnails?: string[];
}

const REGION_STARTERS: Record<string, { name: string; dex: number }[]> = {
  Kanto:  [{ name: 'Bulbasaur', dex: 1 },   { name: 'Charmander', dex: 4 }, { name: 'Squirtle', dex: 7 }],
  Johto:  [{ name: 'Chikorita', dex: 152 },  { name: 'Cyndaquil', dex: 155 }, { name: 'Totodile', dex: 158 }],
  Hoenn:  [{ name: 'Treecko', dex: 252 },    { name: 'Torchic', dex: 255 },  { name: 'Mudkip', dex: 258 }],
  Sinnoh: [{ name: 'Turtwig', dex: 387 },    { name: 'Chimchar', dex: 390 }, { name: 'Piplup', dex: 393 }],
  Unova:  [{ name: 'Snivy', dex: 495 },      { name: 'Tepig', dex: 498 },   { name: 'Oshawott', dex: 501 }],
  Kalos:  [{ name: 'Chespin', dex: 650 },     { name: 'Fennekin', dex: 653 }, { name: 'Froakie', dex: 656 }],
  Alola:  [{ name: 'Rowlet', dex: 722 },      { name: 'Litten', dex: 725 },  { name: 'Popplio', dex: 728 }],
  Galar:  [{ name: 'Grookey', dex: 810 },     { name: 'Scorbunny', dex: 813 }, { name: 'Sobble', dex: 816 }],
  Paldea: [{ name: 'Sprigatito', dex: 906 },  { name: 'Fuecoco', dex: 909 }, { name: 'Quaxly', dex: 912 }],
};

function getSpriteUrl(dex: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;
}

export default function HeaderBanner({
  collectionMode,
  setName,
  regionName,
  cardThumbnails,
}: HeaderBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (collectionMode === 'master-set' && setName) {
    const logoUrl = getSetLogoByName(setName);
    if (!logoUrl) return null;
    return (
      <View style={styles.bannerContainer}>
        <Image
          source={{ uri: logoUrl }}
          style={styles.setLogo}
          contentFit="contain"
        />
      </View>
    );
  }

  if (collectionMode === 'region' && regionName) {
    const starters = REGION_STARTERS[regionName];
    if (!starters) return null;
    return (
      <View style={styles.bannerContainer}>
        <View style={styles.startersRow}>
          {starters.map((s) => (
            <View key={s.dex} style={styles.starterItem}>
              <Image
                source={{ uri: getSpriteUrl(s.dex) }}
                style={styles.starterSprite}
                contentFit="contain"
              />
              <Text style={styles.starterName} numberOfLines={1}>{s.name}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (collectionMode === 'custom') {
    const thumbs = cardThumbnails?.filter(Boolean).slice(0, 4) ?? [];
    if (thumbs.length === 0) {
      return (
        <View style={styles.bannerContainer}>
          <View style={styles.customEmptyBanner}>
            <Ionicons name="grid-outline" size={28} color={colors.textTertiary} />
            <Text style={styles.customEmptyText}>Custom Collection</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.bannerContainer}>
        <View style={styles.mosaicRow}>
          {thumbs.map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={styles.mosaicThumb}
              contentFit="cover"
            />
          ))}
        </View>
      </View>
    );
  }

  return null;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bannerContainer: {
      alignItems: 'center',
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    setLogo: {
      width: '80%',
      height: 48,
    },
    startersRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    starterItem: {
      alignItems: 'center',
      gap: 2,
    },
    starterSprite: {
      width: 56,
      height: 56,
    },
    starterName: {
      fontSize: typography.xs,
      fontFamily: fonts.medium,
      color: colors.textTertiary,
    },
    mosaicRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    mosaicThumb: {
      width: 52,
      height: 72,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.backgroundDark,
    },
    customEmptyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    customEmptyText: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.textTertiary,
    },
  });
