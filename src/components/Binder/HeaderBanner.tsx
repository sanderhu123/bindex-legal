import React, { useMemo } from 'react';
import { View, Text, Image as RNImage, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';
import { getSetLogoByName } from '../../data/pokemonEras';
import ProgressRing from '../Progress/ProgressRing';

const LOGO_TEAL = require('../../../assets/logo-icon-teal.png');

interface HeaderBannerProps {
  collectionMode: 'master-set' | 'region' | 'custom';
  setName?: string;
  regionName?: string;
  /** Completion percentage for progress ring */
  percentage: number;
}

const REGION_INFO: Record<string, { gen: string; startDex: number; endDex: number }> = {
  Kanto:  { gen: 'Gen I',    startDex: 1,   endDex: 151 },
  Johto:  { gen: 'Gen II',   startDex: 152, endDex: 251 },
  Hoenn:  { gen: 'Gen III',  startDex: 252, endDex: 386 },
  Sinnoh: { gen: 'Gen IV',   startDex: 387, endDex: 493 },
  Unova:  { gen: 'Gen V',    startDex: 494, endDex: 649 },
  Kalos:  { gen: 'Gen VI',   startDex: 650, endDex: 721 },
  Alola:  { gen: 'Gen VII',  startDex: 722, endDex: 809 },
  Galar:  { gen: 'Gen VIII', startDex: 810, endDex: 898 },
  Paldea: { gen: 'Gen IX',   startDex: 906, endDex: 1025 },
};

function formatDex(n: number): string {
  return `#${n.toString().padStart(3, '0')}`;
}

export default function HeaderBanner({
  collectionMode,
  setName,
  regionName,
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
    const info = REGION_INFO[regionName];
    return (
      <View style={styles.bannerRow}>
        <View style={[styles.regionBadge, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="map-outline" size={18} color={colors.primary} />
          <View>
            <Text style={[styles.regionName, { color: colors.text }]}>{regionName}</Text>
            {info && (
              <Text style={[styles.regionMeta, { color: colors.textTertiary }]}>
                {info.gen} · {formatDex(info.startDex)}–{formatDex(info.endDex)}
              </Text>
            )}
          </View>
        </View>
        {ring}
      </View>
    );
  }

  if (collectionMode === 'custom') {
    return (
      <View style={styles.bannerRow}>
        <RNImage source={LOGO_TEAL} style={styles.customLogo} resizeMode="contain" />
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
    regionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    regionName: {
      fontSize: typography.base,
      fontFamily: fonts.semibold,
    },
    regionMeta: {
      fontSize: typography.xs,
      fontFamily: fonts.regular,
    },
    customLogo: {
      width: 40,
      height: 40,
      opacity: 0.6,
    },
  });
