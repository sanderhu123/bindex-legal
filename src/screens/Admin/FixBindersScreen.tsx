import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { fixExistingBinders } from '../../utils/fixExistingBinders';
import { colors, spacing, typography, fonts, borderRadius, screenPadding } from '../../constants/theme';

/**
 * Admin screen to fix existing binders after progress caching migration
 * This is a one-time utility screen
 */
export default function FixBindersScreen() {
  const [fixing, setFixing] = useState(false);
  const [results, setResults] = useState<{
    fixed: number;
    errors: number;
    details: Array<{ binderId: string; binderName: string; status: string; totalCards?: number }>;
  } | null>(null);

  const handleFixBinders = async () => {
    Alert.alert(
      'Fix Existing Binders',
      'This will recalculate the total card count for all your binders. This may take a moment. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Binders',
          onPress: async () => {
            setFixing(true);
            setResults(null);
            
            try {
              const result = await fixExistingBinders();
              setResults(result);
              
              if (result.success) {
                Alert.alert(
                  'Success!',
                  `Fixed ${result.fixed} binders successfully!`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'Completed with Errors',
                  `Fixed ${result.fixed} binders, but ${result.errors} had errors. Check the details below.`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to fix binders');
            } finally {
              setFixing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Fix Existing Binders</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ What This Does</Text>
          <Text style={styles.infoText}>
            After the progress caching migration, existing binders need their total card counts recalculated.
          </Text>
          <Text style={styles.infoText}>
            This will fetch the card list for each binder and update the database.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, fixing && styles.buttonDisabled]}
          onPress={handleFixBinders}
          disabled={fixing}
        >
          <Text style={styles.buttonText}>
            {fixing ? 'Fixing Binders...' : 'Fix All Binders'}
          </Text>
        </TouchableOpacity>

        {results && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Results</Text>
            
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>✅ Fixed: {results.fixed}</Text>
              <Text style={styles.summaryText}>❌ Errors: {results.errors}</Text>
            </View>

            {results.details.length > 0 && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Details:</Text>
                {results.details.map((detail, index) => (
                  <View key={detail.binderId} style={styles.detailRow}>
                    <Text style={styles.detailName}>{detail.binderName}</Text>
                    <Text style={styles.detailStatus}>
                      {detail.status.includes('error') ? '❌' : 
                       detail.status.includes('skipped') ? '⏭️' : '✅'} 
                      {' '}{detail.status}
                      {detail.totalCards !== undefined && ` (${detail.totalCards} cards)`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>📝 Note</Text>
          <Text style={styles.noteText}>
            You only need to run this once after the migration. New binders will have their totals calculated automatically.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: screenPadding,
  },
  title: {
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  infoBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoTitle: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: colors.textLight,
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
  resultsContainer: {
    marginTop: spacing.lg,
  },
  resultsTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: typography.base,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detailsContainer: {
    marginTop: spacing.md,
  },
  detailsTitle: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailRow: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  detailName: {
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detailStatus: {
    fontSize: typography.xs,
    color: colors.textLight,
  },
  noteBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  noteTitle: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: typography.sm,
    color: colors.textLight,
  },
});
