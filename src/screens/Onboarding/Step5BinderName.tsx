import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors, fonts, spacing, typography, borderRadius, screenPadding } from '../../constants/theme';

interface Step5BinderNameProps {
  value: string | null;
  onChange: (name: string) => void;
  defaultName: string; // Suggested default name based on collection mode
}

export default function Step5BinderName({ value, onChange, defaultName }: Step5BinderNameProps) {
  const [name, setName] = useState(value || defaultName);
  const [focused, setFocused] = useState(false);

  // Initialize parent state once on mount with default name if value is null
  useEffect(() => {
    if (value === null) {
      onChange(defaultName);
    }
  }, []); // Empty deps - only run once on mount

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

      <View style={styles.suggestionContainer}>
        <Text style={styles.suggestionLabel}>Suggested name:</Text>
        <TouchableOpacity
          style={styles.suggestionButton}
          onPress={() => {
            setName(defaultName);
            onChange(defaultName);
          }}
        >
          <Text style={styles.suggestionText}>{defaultName}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  suggestionContainer: {
    marginTop: spacing.sm,
  },
  suggestionLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  suggestionButton: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  suggestionText: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.primary,
  },
});

