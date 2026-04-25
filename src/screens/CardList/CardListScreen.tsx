import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { fonts, spacing, typography, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface CardListScreenProps {
  navigation: any;
  route: any;
}

export default function CardListScreen({ navigation, route }: CardListScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card List</Text>
      <Text style={styles.text}>This screen will be implemented in Step 15</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
  },
  title: {
    fontSize: typography['3xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  text: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
});
