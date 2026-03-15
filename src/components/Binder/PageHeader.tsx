import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, type ThemeColors } from '../../constants/theme';

interface PageHeaderProps {
  pageNumber: number;
}

/**
 * Page header/separator component for grid view
 * Shows a horizontal line with page number in the middle
 * Visual: ─────────── 📖 Page 1 ───────────
 */
export default function PageHeader({ pageNumber }: PageHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>📖 Page {pageNumber}</Text>
      <View style={styles.line} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginVertical: spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  text: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
  },
});
