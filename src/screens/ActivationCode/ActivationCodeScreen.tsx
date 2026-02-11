import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { validateTagByCode, claimCode } from '../../services/supabase/registeredTags';

interface ActivationCodeScreenProps {
  navigation: any;
}

export default function ActivationCodeScreen({ navigation }: ActivationCodeScreenProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle activation code submission
   */
  const handleActivate = async () => {
    // Reset error
    setError(null);

    // Validate input
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Please enter an activation code');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Validate the code against the database
      const tagInfo = await validateTagByCode(trimmedCode);

      if (!tagInfo) {
        setError('Invalid activation code. Please check the code and try again.');
        setLoading(false);
        return;
      }

      // Step 2: Check the code's status
      if (tagInfo.status === 'claimed') {
        setError('This code has already been used.');
        setLoading(false);
        return;
      }

      if (tagInfo.status === 'disabled') {
        setError('This code has been deactivated. Please contact support.');
        setLoading(false);
        return;
      }

      // Step 3: Claim the code
      const claimed = await claimCode(tagInfo.id);

      if (!claimed) {
        setError('Could not activate this code. Please try again.');
        setLoading(false);
        return;
      }

      // Step 4: Success! Navigate to questionnaire to create a binder
      // Pass the code ID so the binder can be linked after creation
      Alert.alert(
        'Code Activated!',
        'Your activation code has been accepted. Let\'s set up your new binder!',
        [
          {
            text: 'Continue',
            onPress: () => {
              navigation.replace('Questionnaire', {
                activationCodeId: tagInfo.id,
              });
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('[35F] Activation error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Activate Your Binder</Text>

        {/* Description */}
        <Text style={styles.description}>
          Enter the activation code from the card inside your binder box.
        </Text>

        {/* Code input */}
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="BINDER-XXXX-XXXX"
          placeholderTextColor={colors.textLight}
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError(null); // Clear error when typing
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleActivate}
        />

        {/* Error message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Activate button */}
        <TouchableOpacity
          style={[styles.activateButton, loading ? styles.activateButtonDisabled : null]}
          onPress={handleActivate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.activateButtonText}>Activate Binder</Text>
          )}
        </TouchableOpacity>

        {/* Info section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Where is my code?</Text>
          <Text style={styles.infoText}>
            Look for the activation card inside your binder box. The code looks like: BINDER-XXXX-XXXX
          </Text>
        </View>

        {/* Binder limit info */}
        <View style={styles.limitSection}>
          <Text style={styles.limitTitle}>Binder Limits</Text>
          <Text style={styles.limitText}>1 binder purchased = 3 app binders</Text>
          <Text style={styles.limitText}>2 binders purchased = 5 app binders</Text>
          <Text style={styles.limitText}>3+ binders purchased = Unlimited</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    padding: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backButtonText: {
    fontSize: typography.body,
    color: colors.primary,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.h3,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    backgroundColor: colors.backgroundLight,
    marginBottom: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  activateButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  activateButtonDisabled: {
    opacity: 0.6,
  },
  activateButtonText: {
    color: '#fff',
    fontSize: typography.body,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    lineHeight: 20,
  },
  limitSection: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  limitTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  limitText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    lineHeight: 20,
  },
});
