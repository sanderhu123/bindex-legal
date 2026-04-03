import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, borderRadius, type ThemeColors } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
}

export default function SearchBar({ 
  value, 
  onChangeText, 
  placeholder = 'Search by name or number...',
  compact = false,
  autoFocus = false,
  onFocus,
}: SearchBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      <Ionicons name="search" size={compact ? 16 : 18} color={colors.textTertiary} style={styles.icon} />
      <TextInput
        style={compact ? styles.inputCompact : styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onFocus={onFocus}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.sm + 4,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    containerCompact: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundDark,
      borderRadius: borderRadius.md,
      height: 36,
    },
    icon: {
      marginLeft: spacing.sm + 4,
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.sm + 4,
      fontSize: typography.base,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    inputCompact: {
      flex: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: 0,
      fontSize: typography.sm - 1,
      color: colors.text,
      fontFamily: fonts.regular,
    },
  });
