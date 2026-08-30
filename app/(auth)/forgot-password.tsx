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
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function ForgotPasswordScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestReset = async () => {
    setErrorMessage(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    await haptics.selection();
    const result = await resetPasswordForEmail(trimmedEmail);
    setLoading(false);

    if (result.success) {
      await haptics.success();
      setSent(true);
    } else {
      await haptics.error();
      setErrorMessage(result.error || 'Failed to send reset link.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <ArrowLeft size={20} color={theme.textPrimary} />
          <Text style={[Typography.bodySmall, { color: theme.textPrimary, marginLeft: 6 }]}>
            Back to Sign In
          </Text>
        </Pressable>

        <View style={styles.brandHeader}>
          <Text style={[Typography.eyebrow, { color: theme.primary }]}>
            SECURITY RECOVERY
          </Text>
          <Text style={[Typography.displayLarge, { color: theme.textPrimary, marginTop: 6 }]}>
            Reset Password
          </Text>
          <Text style={[Typography.bodyMedium, { color: theme.textSecondary, marginTop: 4 }]}>
            Enter your email to receive a secure recovery link.
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

        {sent ? (
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
              Check Your Inbox
            </Text>
            <Text
              style={[
                Typography.bodySmall,
                { color: theme.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
              ]}
            >
              If an account matches <Text style={{ fontWeight: '700' }}>{email}</Text>, a password reset link has been dispatched.
            </Text>

            <Button
              title="Return to Sign In"
              variant="outline"
              size="medium"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: Spacing.lg, width: '100%' }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 6 }]}>
                EMAIL ADDRESS
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

            <Button
              title="Send Reset Link"
              size="large"
              loading={loading}
              disabled={loading}
              onPress={handleRequestReset}
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
    paddingTop: Spacing.lg,
    paddingBottom: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
});
