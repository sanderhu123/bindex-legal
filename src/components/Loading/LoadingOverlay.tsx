import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

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
  color = colors.textTertiary,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="small" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
});

