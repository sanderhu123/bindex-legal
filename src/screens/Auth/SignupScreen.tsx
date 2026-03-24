import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUp } from '../../services/supabase/auth';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { showError, showSuccess } from '../../utils/toast';
import { PrimaryButton, TextButton } from '../../components/Button';

interface SignupScreenProps {
  navigation: any;
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      showError('Missing fields', 'Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      showError('Too short', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, displayName || undefined);
      
      // Check if email confirmation is required
      if (result.user && !result.session) {
        // Email confirmation required
        Alert.alert(
          'Check Your Email',
          'We sent you a confirmation email. Please click the link in the email to verify your account, then come back and log in.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to login screen
                navigation.navigate('Login');
              },
            },
          ]
        );
      } else if (result.session) {
        showSuccess('Welcome!', 'Account created. You are now signed in.');
      }
    } catch (error: any) {
      showError('Signup Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={isDark ? require('../../../assets/logo-wordmark-white.png') : require('../../../assets/logo-wordmark.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Create account</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Display Name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={colors.textLight}
              value={displayName}
              onChangeText={setDisplayName}
              accessibilityLabel="Display name"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Email address"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password (min 6 characters)"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
            />
          </View>
          
          <PrimaryButton
            title={loading ? 'Creating account...' : 'Sign Up'}
            onPress={handleSignup}
            loading={loading}
            style={styles.button}
          />
          
          <TextButton
            title="Already have an account? Login"
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: screenPadding,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    height: 40,
    width: 160,
  },
  title: {
    fontSize: typography['2xl'],
    fontFamily: fonts.semibold,
    marginBottom: spacing.xl,
    textAlign: 'center',
    color: colors.text,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.base,
    fontFamily: fonts.regular,
    backgroundColor: colors.background,
    color: colors.text,
  },
  button: {
    marginTop: spacing.sm,
  },
  linkButton: {
    marginTop: spacing.lg,
  },
  });

