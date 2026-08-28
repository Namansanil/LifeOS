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
import { Shield, Sparkles } from 'lucide-react-native';

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { login, loginDemoUser, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    await login(email, password);
    router.replace('/(tabs)');
  };

  const handleDemoLogin = async () => {
    await loginDemoUser();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <Text style={[Typography.eyebrow, { color: theme.primary }]}>
            LIFEOS · PERSONAL OPERATING SYSTEM
          </Text>
          <Text style={[Typography.displayLarge, { color: theme.textPrimary, marginTop: 4 }]}>
            Welcome Back
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
            Sign in to your private athletic and personal operating system.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
              EMAIL ADDRESS
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="athlete@lifeos.app"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.textInput,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
              PASSWORD
            </Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.textInput,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            />
          </View>

          <Button
            title="Sign In"
            size="large"
            loading={isLoading}
            onPress={handleLogin}
            style={{ marginTop: Spacing.md }}
          />

          <Button
            title="Quick Demo Mode (Naman)"
            variant="outline"
            size="medium"
            icon={<Sparkles size={16} color={theme.primary} />}
            onPress={handleDemoLogin}
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
    marginBottom: Spacing.xxl,
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {},
  textInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  signupLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});
