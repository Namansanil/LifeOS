import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    await haptics.selection();
    const result = await login(trimmedEmail, password);

    if (result.success) {
      await haptics.success();
      router.replace('/(tabs)');
    } else {
      await haptics.error();
      setErrorMessage(result.error || 'Invalid email or password.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandHeader}>
          <Text style={[Typography.eyebrow, { color: theme.primary }]}>
            LIFEOS · PERSONAL OPERATING SYSTEM
          </Text>
          <Text style={[Typography.displayLarge, { color: theme.textPrimary, marginTop: 6 }]}>
            Welcome Back
          </Text>
          <Text style={[Typography.bodyMedium, { color: theme.textSecondary, marginTop: 4 }]}>
            Sign in to access your personal routines, activities, and metrics.
          </Text>
        </View>

        {errorMessage && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: isDark ? '#3D1515' : '#FDE8E8',
                borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
              },
            ]}
          >
            <AlertCircle size={18} color="#E02424" />
            <Text style={[Typography.bodySmall, { color: isDark ? '#FCA5A5' : '#9B1C1C', flex: 1, marginLeft: 8 }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
              EMAIL ADDRESS
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            >
              <Mail size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="athlete@lifeos.app"
                placeholderTextColor={theme.textMuted}
                style={[styles.textInput, { color: theme.textPrimary }]}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.passwordHeader}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                PASSWORD
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/forgot-password')}
                hitSlop={8}
              >
                <Text style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                  Forgot Password?
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            >
              <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                style={[styles.textInput, { color: theme.textPrimary }]}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
                hitSlop={8}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} color={theme.textMuted} />
                ) : (
                  <Eye size={18} color={theme.textMuted} />
                )}
              </Pressable>
            </View>
          </View>

          <Button
            title="Sign In"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            onPress={handleLogin}
            style={{ marginTop: Spacing.md }}
          />

          <Pressable
            onPress={() => router.push('/(auth)/signup')}
            style={styles.signupLink}
          >
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              Don't have an account?{' '}
              <Text style={{ color: theme.primary, fontWeight: '700' }}>
                Create Account
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.screenHorizontal,
    paddingTop: Spacing.xxxl,
    paddingBottom: 60,
  },
  brandHeader: {
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {},
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  signupLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
