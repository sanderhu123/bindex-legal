import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, type ThemeColors } from '../../constants/theme';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({
  message = 'Loading...',
  fullScreen = true,
}: LoadingScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View style={containerStyle}>
      <Animated.View style={{ opacity: pulseAnim }}>
        <Image
          source={require('../../../assets/logo-icon-teal.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logo: {
    width: 48,
    height: 48,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
