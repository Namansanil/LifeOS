import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function SignupScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { signup, isLoading } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignup = async () => {
    setErrorMessage(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirst) {
      setErrorMessage('Please enter your first name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    await haptics.selection();
    const result = await signup(trimmedEmail, password, trimmedFirst, trimmedLast);

    if (result.success) {
      await haptics.success();
      if (result.requiresVerification) {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: trimmedEmail },
        });
      } else {
        router.replace('/(tabs)');
      }
    } else {
      await haptics.error();
      setErrorMessage(result.error || 'Failed to create account.');
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
            JOIN LIFEOS
          </Text>
          <Text style={[Typography.displayLarge, { color: theme.textPrimary, marginTop: 6 }]}>
            Create Account
          </Text>
          <Text style={[Typography.bodyMedium, { color: theme.textSecondary, marginTop: 4 }]}>
            Your multi-pillar operating system for athletics, study, and life.
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
          {/* Name Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
                FIRST NAME *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <User size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={firstName}
                  onChangeText={(t) => {
                    setFirstName(t);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. Alex"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.textInput, { color: theme.textPrimary }]}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
                LAST NAME
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="e.g. Mercer"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.textInput, { color: theme.textPrimary }]}
                />
              </View>
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
              EMAIL ADDRESS *
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { borderColor: theme.border, backgroundColor: theme.surface },
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

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
              PASSWORD (MIN 8 CHARACTERS) *
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
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
              >
                {showPassword ? (
                  <EyeOff size={18} color={theme.textMuted} />
                ) : (
                  <Eye size={18} color={theme.textMuted} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
              CONFIRM PASSWORD *
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                style={[styles.textInput, { color: theme.textPrimary }]}
              />
            </View>
          </View>

          <Button
            title="Create Account"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            onPress={handleSignup}
            style={{ marginTop: Spacing.md }}
          />

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={styles.loginLink}
          >
            <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: theme.primary, fontWeight: '700' }}>
                Sign In
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  inputGroup: {},
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
  loginLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
