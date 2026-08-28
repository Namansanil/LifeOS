import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { PILLAR_METADATA } from '@/constants/activity';
import { LifePillar } from '@/types';
import { Check } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function OnboardingScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { updateEnabledPillars } = useAuth();

  const [pillars, setPillars] = useState({
    move: true,
    surf: true,
    learn: true,
    build: true,
    live: true,
  });

  const toggle = async (key: keyof typeof pillars) => {
    await haptics.selection();
    setPillars((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinish = async () => {
    await haptics.success();
    await updateEnabledPillars(pillars);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[Typography.eyebrow, { color: theme.primary }]}>
            PERSONALIZATION
          </Text>
          <Text style={[Typography.displayLarge, { color: theme.textPrimary, marginTop: 4 }]}>
            What Matters to You?
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 4 }]}>
            LifeOS adapts to your life. Choose which dimensions to focus on. You can always change this in Settings.
          </Text>
        </View>

        <View style={styles.pillarList}>
          {(
            [
              { key: 'move', pillar: 'MOVE' as LifePillar },
              { key: 'surf', pillar: 'SURF' as LifePillar },
              { key: 'learn', pillar: 'LEARN' as LifePillar },
              { key: 'build', pillar: 'BUILD' as LifePillar },
              { key: 'live', pillar: 'LIVE' as LifePillar },
            ] as const
          ).map((item) => {
            const meta = PILLAR_METADATA[item.pillar];
            const isSelected = pillars[item.key];

            return (
              <Pressable
                key={item.key}
                onPress={() => toggle(item.key)}
                style={({ pressed }) => [
                  styles.pillarCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Shadows.subtle,
                ]}
              >
                <View style={styles.pillarText}>
                  <Text style={[Typography.headingSmall, { color: theme.textPrimary }]}>
                    {meta.label}
                  </Text>
                  <Text style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                    {meta.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected ? theme.primary : 'transparent',
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  {isSelected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Enter LifeOS"
          size="large"
          onPress={handleFinish}
          style={{ marginTop: Spacing.xxl }}
        />
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
    paddingTop: Spacing.xl,
    paddingBottom: 60,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  pillarList: {
    gap: Spacing.sm,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  pillarText: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
