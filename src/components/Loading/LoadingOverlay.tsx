import React, { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { type ThemeColors } from '../../constants/theme';

interface LoadingOverlayProps {
  visible: boolean;
  color?: string;
}

/**
 * Loading overlay component
 * Use for overlaying loading state on existing content (e.g., image loading)
 */
export default function LoadingOverlay({
  visible,
  color: colorProp,
}: LoadingOverlayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = colorProp ?? colors.textTertiary;
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="small" color={color} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
});

