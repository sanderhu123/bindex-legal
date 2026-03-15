import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, type ThemeColors } from '../../constants/theme';

interface ErrorMessageProps {
  message: string;
  style?: any;
}

/**
 * Small error message component
 * Use for form validation errors or small inline errors
 */
export default function ErrorMessage({ message, style }: ErrorMessageProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={[styles.error, style]}>{message}</Text>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  error: {
    fontSize: typography.sm,
    color: colors.error,
    marginTop: 4,
  },
});

