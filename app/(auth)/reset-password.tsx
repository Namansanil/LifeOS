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
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function ResetPasswordScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    await haptics.selection();
    const result = await updatePassword(password);
    setLoading(false);

    if (result.success) {
      await haptics.success();
      setSuccess(true);
    } else {
      await haptics.error();
      setErrorMessage(result.error || 'Failed to update password.');
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
            CREDENTIAL UPDATE
          </Text>
          <Text style={[Typography.displayLarge, { color: theme.textPrimary, marginTop: 6 }]}>
            Set New Password
          </Text>
          <Text style={[Typography.bodyMedium, { color: theme.textSecondary, marginTop: 4 }]}>
            Choose a secure password with at least 8 characters.
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

        {success ? (
          <View
            style={[
              styles.successCard,
              {
                backgroundColor: isDark ? '#143823' : theme.primaryMuted,
                borderColor: isDark ? '#1C4ED8' : theme.primary,
              },
            ]}
          >
            <CheckCircle2 size={32} color={theme.primary} />
            <Text style={[Typography.headingSmall, { color: theme.textPrimary, marginTop: 12 }]}>
              Password Updated
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary, textAlign: 'center', marginTop: 6 }]}>
              Your account credentials have been securely updated.
            </Text>

            <Button
              title="Continue to LifeOS"
              size="medium"
              onPress={() => router.replace('/(tabs)')}
              style={{ marginTop: Spacing.lg, width: '100%' }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
                NEW PASSWORD *
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

            <View style={styles.inputGroup}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
                CONFIRM NEW PASSWORD *
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
              title="Save New Password"
              size="large"
              loading={loading}
              disabled={loading}
              onPress={handleUpdatePassword}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}
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
  successCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  form: {
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
});
