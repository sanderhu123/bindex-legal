import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fonts, type ThemeColors } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  compact?: boolean;
}

export default function SearchBar({ 
  value, 
  onChangeText, 
  placeholder = 'Search by name or number...',
  compact = false,
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
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    containerCompact: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundDark,
      borderRadius: 8,
      height: 36,
    },
    icon: {
      marginLeft: 12,
    },
    input: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    inputCompact: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 0,
      fontSize: 13,
      color: colors.text,
      fontFamily: fonts.regular,
    },
  });
