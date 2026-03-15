import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import { fonts, spacing, typography, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface Step5BinderNameProps {
  value: string | null;
  onChange: (name: string) => void;
  defaultName: string;
}

export default function Step5BinderName({ value, onChange, defaultName }: Step5BinderNameProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(value || defaultName);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value === null) {
      onChange(defaultName);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Name Your Binder</Text>
      <Text style={styles.description}>
        Give your binder a custom name. You can change this later.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={name}
          onChangeText={(text) => {
            setName(text);
            onChange(text);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Enter binder name"
          placeholderTextColor={colors.textLight}
          autoFocus
          maxLength={100}
        />
        {name && name.trim() === '' && (
          <Text style={styles.errorText}>Binder name cannot be empty</Text>
        )}
      </View>

    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: screenPadding,
  },
  title: {
    fontSize: typography['2xl'],
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  errorText: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
