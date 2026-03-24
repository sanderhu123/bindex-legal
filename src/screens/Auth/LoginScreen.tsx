import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Platform, Linking, Image, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signInWithGoogle, signInWithApple } from '../../services/supabase/auth';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { showError } from '../../utils/toast';
import { PrimaryButton, SecondaryButton, TextButton } from '../../components/Button';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { refreshUser } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Missing fields', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      await refreshUser();
    } catch (error: any) {
      showError('Login Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      const result = await signInWithGoogle();
      if (result?.url) {
        await Linking.openURL(result.url);
      } else {
        showError('Google Login', 'Could not start Google login. Please try again.');
      }
    } catch (error: any) {
      showError('Google Login Failed', error.message || 'An error occurred');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      showError('Apple Login', 'Apple login is only available on iOS devices.');
      return;
    }

    setSocialLoading('apple');
    try {
      const result = await signInWithApple();
      if (result?.url) {
        await Linking.openURL(result.url);
      } else {
        showError('Apple Login', 'Could not start Apple login. Please try again.');
      }
    } catch (error: any) {
      showError('Apple Login Failed', error.message || 'An error occurred');
    } finally {
      setSocialLoading(null);
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

          <Text style={styles.title}>Welcome back</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password"
          />
          
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setStayLoggedIn(!stayLoggedIn)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: stayLoggedIn }}
            accessibilityLabel="Stay logged in"
          >
            <View style={[styles.checkbox, stayLoggedIn && styles.checkboxChecked]}>
              {stayLoggedIn && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Stay logged in</Text>
          </TouchableOpacity>
          
          <PrimaryButton
            title={loading ? 'Logging in...' : 'Login'}
            onPress={handleLogin}
            loading={loading}
            disabled={socialLoading !== null}
            style={styles.button}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <SecondaryButton
            title={socialLoading === 'google' ? 'Opening Google...' : 'Continue with Google'}
            onPress={handleGoogleLogin}
            loading={socialLoading === 'google'}
            disabled={socialLoading !== null}
            style={styles.socialButton}
          />

          <SecondaryButton
            title={socialLoading === 'apple' ? 'Opening Apple...' : 'Continue with Apple'}
            onPress={handleAppleLogin}
            loading={socialLoading === 'apple'}
            disabled={socialLoading !== null}
            style={styles.socialButton}
          />
          
          <TextButton
            title="Don't have an account? Sign up"
            onPress={() => navigation.navigate('Signup')}
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.base,
    fontFamily: fonts.regular,
    backgroundColor: colors.background,
    color: colors.text,
  },
  button: {
    marginTop: spacing.sm,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    color: colors.textTertiary,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
  },
  socialButton: {
    marginTop: spacing.sm,
  },
  linkButton: {
    marginTop: spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.onPrimary,
    fontSize: typography.sm,
    fontFamily: fonts.bold,
  },
  checkboxLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  });
