import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';

interface HeaderBannerProps {
  collectionMode: 'master-set' | 'region' | 'custom';
  setName?: string;
  regionName?: string;
  percentage: number;
}

export default function HeaderBanner({
  collectionMode,
  regionName,
}: HeaderBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (collectionMode === 'region' && regionName) {
    return (
      <View style={styles.bannerRow}>
        <View style={[styles.regionBadge, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="map-outline" size={18} color={colors.primary} />
          <Text style={[styles.regionName, { color: colors.text }]}>{regionName}</Text>
        </View>
      </View>
    );
  }

  return null;
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
  });
