import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';

const CARD_MARGIN = 2;
const CONTAINER_PADDING = screenPadding;

interface SkeletonCardGridProps {
  columns?: number;
  rows?: number;
}

function SkeletonCard({ width, opacity }: { width: number; opacity: Animated.Value }) {
  const { colors } = useTheme();
  const cardHeight = width / 0.716;

  return (
    <View style={{ width, margin: CARD_MARGIN, marginBottom: 8, alignItems: 'center' }}>
      <Animated.View
        style={{
          width: '100%',
          height: cardHeight,
          borderRadius: borderRadius.md,
          backgroundColor: colors.backgroundDark,
          opacity,
        }}
      />
      <Animated.View
        style={{
          width: '70%',
          height: 10,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.backgroundDark,
          marginTop: spacing.xs,
          opacity,
        }}
      />
      <Animated.View
        style={{
          width: '40%',
          height: 8,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.backgroundDark,
          marginTop: 4,
          opacity,
        }}
      />
    </View>
  );
}

export default function SkeletonCardGrid({ columns = 3, rows = 4 }: SkeletonCardGridProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const screenWidth = Dimensions.get('window').width;
  const gridWidth = screenWidth - ((CONTAINER_PADDING - CARD_MARGIN) * 2);
  const cardWidth = (gridWidth / columns) - (CARD_MARGIN * 2);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonCard
              key={colIndex}
              width={cardWidth}
              opacity={pulseAnim}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
