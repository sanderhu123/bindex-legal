import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { fonts, typography, type ThemeColors } from '../../constants/theme';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  /** Custom label to show inside the ring instead of percentage */
  label?: string;
}

export default function ProgressRing({ percentage, size = 44, strokeWidth = 4, label }: ProgressRingProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const fillColor = clamped === 100 ? colors.success : colors.primary;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: fillColor }]}>{label ?? `${clamped}%`}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors, size: number) =>
  StyleSheet.create({
    container: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    },
    svg: {
      position: 'absolute',
    },
    labelContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: size <= 36 ? 9 : size <= 44 ? 11 : typography.xs,
      fontFamily: fonts.semibold,
    },
  });
