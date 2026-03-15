import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Platform, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signInWithGoogle, signInWithApple } from '../../services/supabase/auth';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, spacing, typography, borderRadius, screenPadding } from '../../constants/theme';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { refreshUser } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      await refreshUser();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
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
        Alert.alert('Google Login', 'Could not start Google login. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Google Login Failed', error.message || 'An error occurred');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Login', 'Apple login is only available on iOS devices.');
      return;
    }

    setSocialLoading('apple');
    try {
      const result = await signInWithApple();
      if (result?.url) {
        await Linking.openURL(result.url);
      } else {
        Alert.alert('Apple Login', 'Could not start Apple login. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Apple Login Failed', error.message || 'An error occurred');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/logo-wordmark.png')}
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
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textLight}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setStayLoggedIn(!stayLoggedIn)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, stayLoggedIn && styles.checkboxChecked]}>
          {stayLoggedIn && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>Stay logged in</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, (loading || socialLoading !== null) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading || socialLoading !== null}
      >
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.socialButton, socialLoading === 'google' && styles.buttonDisabled]}
        onPress={handleGoogleLogin}
        disabled={socialLoading !== null}
      >
        <Text style={styles.socialButtonText}>
          {socialLoading === 'google' ? 'Opening Google...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.socialButton, socialLoading === 'apple' && styles.buttonDisabled]}
        onPress={handleAppleLogin}
        disabled={socialLoading !== null}
      >
        <Text style={styles.socialButtonText}>
          {socialLoading === 'apple' ? 'Opening Apple...' : 'Continue with Apple'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: screenPadding,
    backgroundColor: colors.background,
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
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md - 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  socialButtonText: {
    color: colors.text,
    fontSize: typography.base,
    fontFamily: fonts.medium,
  },
  linkText: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
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
    color: colors.background,
    fontSize: typography.sm,
    fontFamily: fonts.bold,
  },
  checkboxLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});
