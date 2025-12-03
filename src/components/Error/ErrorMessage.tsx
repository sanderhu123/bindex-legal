import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../constants/theme';

interface ErrorMessageProps {
  message: string;
  style?: any;
}

/**
 * Small error message component
 * Use for form validation errors or small inline errors
 */
export default function ErrorMessage({ message, style }: ErrorMessageProps) {
  return <Text style={[styles.error, style]}>{message}</Text>;
}

const styles = StyleSheet.create({
  error: {
    fontSize: typography.sm,
    color: colors.error,
    marginTop: 4,
  },
});

