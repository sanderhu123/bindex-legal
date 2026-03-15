import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/theme';

interface Step5BinderNameProps {
  value: string | null;
  onChange: (name: string) => void;
  defaultName: string; // Suggested default name based on collection mode
}

export default function Step5BinderName({ value, onChange, defaultName }: Step5BinderNameProps) {
  const [name, setName] = useState(value || defaultName);

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
          style={styles.input}
          value={name}
          onChangeText={(text) => {
            setName(text);
            onChange(text);
          }}
          placeholder="Enter binder name"
          placeholderTextColor="#999"
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.semibold,
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#FF3B30',
    marginTop: 8,
  },
  suggestionContainer: {
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 8,
  },
  suggestionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#007AFF',
  },
});

