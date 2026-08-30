import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { Mail, CheckCircle2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function VerifyEmailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { resendVerificationEmail } = useAuth();

  const email = params.email || 'your email';
  const [cooldown, setCooldown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !params.email) return;
    setErrorMessage(null);
    setLoading(true);
    await haptics.selection();
    const result = await resendVerificationEmail(params.email);
    setLoading(false);

    if (result.success) {
      await haptics.success();
      setResent(true);
      setCooldown(60);
    } else {
      await haptics.error();
      setErrorMessage(result.error || 'Failed to resend verification email.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
          hitSlop={12}
        >
          <ArrowLeft size={20} color={theme.textPrimary} />
          <Text style={[Typography.bodySmall, { color: theme.textPrimary, marginLeft: 6 }]}>
            Back to Sign In
          </Text>
        </Pressable>

        <View style={styles.centerContainer}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark ? '#143823' : theme.primaryMuted,
                borderColor: isDark ? '#1C4ED8' : theme.primary,
              },
            ]}
          >
            <Mail size={40} color={theme.primary} />
          </View>

          <Text style={[Typography.displayMedium, { color: theme.textPrimary, textAlign: 'center', marginTop: Spacing.lg }]}>
            Verify Your Email
          </Text>

          <Text style={[Typography.bodyMedium, { color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 }]}>
            We sent a verification link to{'\n'}
            <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{email}</Text>
          </Text>

          <Text style={[Typography.bodySmall, { color: theme.textMuted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 }]}>
            Please tap the link in your email to activate your account and start using LifeOS.
          </Text>

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

          {resent && (
            <View
              style={[
                styles.successBanner,
                {
                  backgroundColor: isDark ? '#143823' : theme.primaryMuted,
                  borderColor: theme.primary,
                },
              ]}
            >
              <CheckCircle2 size={16} color={theme.primary} />
              <Text style={[Typography.caption, { color: theme.primary, marginLeft: 6 }]}>
                Verification email resent successfully!
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="I've Verified My Email · Sign In"
              size="large"
              onPress={() => router.replace('/(auth)/login')}
              style={{ width: '100%' }}
            />

            <Button
              title={
                cooldown > 0
                  ? `Resend Email in ${cooldown}s`
                  : 'Resend Verification Email'
              }
              variant="outline"
              size="medium"
              loading={loading}
              disabled={cooldown > 0 || loading}
              onPress={handleResend}
              style={{ width: '100%', marginTop: Spacing.sm }}
            />
          </View>
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
    paddingTop: Spacing.lg,
    paddingBottom: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  centerContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
    width: '100%',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  actions: {
    width: '100%',
    marginTop: Spacing.xxl,
  },
});
