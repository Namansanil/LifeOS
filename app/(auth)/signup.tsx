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

export default function SignupScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { signup, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) return;
    await signup(email, password, name || 'Athlete');
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <Text style={[Typography.eyebrow, { color: theme.primary }]}>
            JOIN LIFEOS
          </Text>
          <Text style={[Typography.displayLarge, { color: theme.textPrimary, marginTop: 4 }]}>
            Create Account
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
            Your multi-pillar personal operating system.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginBottom: 4 }]}>
              YOUR NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Naman"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.textInput,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            />
          </View>

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
            title="Create Account"
            size="large"
            loading={isLoading}
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
  loginLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});
