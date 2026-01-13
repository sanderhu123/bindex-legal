import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, typography } from '../../constants/theme';

interface BinderEditScreenProps {}

/**
 * Binder Edit Screen (Placeholder)
 * This screen will be fully implemented in Step 34B.
 * For now it just shows a placeholder with the binder ID.
 */
export default function BinderEditScreen({}: BinderEditScreenProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const { binderId } = route.params as { binderId: string };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Binder</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.placeholderIcon}>🚧</Text>
        <Text style={styles.placeholderTitle}>Binder Edit Mode</Text>
        <Text style={styles.placeholderText}>
          This feature is coming in Step 34B!
        </Text>
        <Text style={styles.binderId}>
          Binder ID: {binderId}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.base,
    color: colors.primary,
    fontWeight: typography.medium,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
  },
  placeholder: {
    width: 60, // Match back button width for centering
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  placeholderTitle: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  placeholderText: {
    fontSize: typography.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  binderId: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
});
