import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/common/Button';
import {
  User,
  Sliders,
  Moon,
  Sun,
  Shield,
  Download,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { haptics } from '@/services/haptics';
import { PILLAR_METADATA } from '@/constants/activity';
import { LifePillar } from '@/types';
import { db } from '@/services/database';

export default function ProfileScreen() {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { user, logout, updateEnabledPillars, updatePreferences } = useAuth();
  const router = useRouter();

  const enabledPillars = user?.enabled_pillars || {
    move: true,
    surf: true,
    learn: true,
    build: true,
    live: true,
  };

  const handleTogglePillar = async (pillarKey: keyof typeof enabledPillars) => {
    await haptics.selection();
    const updated = { ...enabledPillars, [pillarKey]: !enabledPillars[pillarKey] };
    await updateEnabledPillars(updated);
  };

  const handleExportData = async () => {
    await haptics.medium();
    const userId = user?.id || 'demo-user-naman';
    const activities = await db.getActivities(userId);
    const workouts = await db.getWorkouts(userId);
    const surf = await db.getSurfSessions(userId);
    const study = await db.getStudySessions(userId);
    const projects = await db.getProjects(userId);
    const habits = await db.getHabits(userId);

    const exportBundle = {
      exported_at: new Date().toISOString(),
      user,
      activities,
      workouts,
      surf,
      study,
      projects,
      habits,
    };

    if (Platform.OS === 'web') {
      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos_export_${Date.now()}.json`;
      a.click();
    } else {
      Alert.alert(
        'Export Generated',
        `Successfully exported ${activities.length + workouts.length} records.`
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader title="PROFILE & SETTINGS" showProfile={false} />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            Shadows.subtle,
          ]}
        >
          <View
            style={[
              styles.avatarLarge,
              { backgroundColor: isDark ? '#143823' : theme.primaryMuted },
            ]}
          >
            <User size={32} color={theme.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[Typography.headingMedium, { color: theme.textPrimary }]}>
              {user?.full_name || 'Naman'}
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
              {user?.email || 'naman@lifeos.app'}
            </Text>
            <View style={[styles.memberBadge, { backgroundColor: isDark ? '#232833' : theme.surfaceSubdued }]}>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                LIFEOS ATHLETIC CLUB
              </Text>
            </View>
          </View>
        </View>

        {/* Dynamic Pillar Customization */}
        <View style={styles.section}>
          <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: Spacing.sm }]}>
            PILLAR PERSONALIZATION
          </Text>
          <Text style={[Typography.caption, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
            Enable or disable pillars to tailor the Today screen and calculations to your life.
          </Text>

          <View
            style={[
              styles.settingsCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              Shadows.subtle,
            ]}
          >
            {(
              [
                { key: 'move', pillar: 'MOVE' as LifePillar },
                { key: 'surf', pillar: 'SURF' as LifePillar },
                { key: 'learn', pillar: 'LEARN' as LifePillar },
                { key: 'build', pillar: 'BUILD' as LifePillar },
                { key: 'live', pillar: 'LIVE' as LifePillar },
              ] as const
            ).map((p, idx) => {
              const meta = PILLAR_METADATA[p.pillar];
              const isEnabled = enabledPillars[p.key];

              return (
                <View
                  key={p.key}
                  style={[
                    styles.settingRow,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: theme.borderLight },
                  ]}
                >
                  <View style={styles.settingText}>
                    <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                      {meta.label}
                    </Text>
                    <Text style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                      {meta.description}
                    </Text>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={() => handleTogglePillar(p.key)}
                    trackColor={{ false: theme.borderLight, true: theme.primary }}
                    thumbColor={theme.surface}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Appearance & Theme */}
        <View style={styles.section}>
          <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: Spacing.sm }]}>
            APPEARANCE
          </Text>

          <View
            style={[
              styles.settingsCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              Shadows.subtle,
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                  Theme
                </Text>
                <Text style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                  Classic parchment, dark mode, or follow system
                </Text>
              </View>

              <View style={styles.themeToggleRow}>
                {(['light', 'dark', 'system'] as const).map((mode) => {
                  const isSelected = themeMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={async () => {
                        await haptics.selection();
                        await setThemeMode(mode);
                      }}
                      style={[
                        styles.themeButton,
                        {
                          backgroundColor: isSelected
                            ? theme.primary
                            : isDark
                            ? '#232833'
                            : theme.surfaceSubdued,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          Typography.eyebrowSmall,
                          {
                            color: isSelected
                              ? theme.primaryForeground
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {mode.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Data & Privacy Actions */}
        <View style={styles.section}>
          <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: Spacing.sm }]}>
            DATA & PRIVACY
          </Text>

          <View
            style={[
              styles.settingsCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              Shadows.subtle,
            ]}
          >
            <Pressable
              onPress={handleExportData}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Download size={18} color={theme.textPrimary} />
              <Text style={[Typography.labelBold, { color: theme.textPrimary, marginLeft: Spacing.md, flex: 1 }]}>
                Export Personal Data (JSON)
              </Text>
              <ChevronRight size={16} color={theme.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Sign Out */}
        <View style={{ marginTop: Spacing.xl, marginHorizontal: Spacing.screenHorizontal }}>
          <Button
            title="Sign Out"
            variant="outline"
            icon={<LogOut size={16} color={theme.textPrimary} />}
            onPress={async () => {
              await haptics.medium();
              await logout();
              router.replace('/(auth)/login');
            }}
          />
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
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  memberBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    marginTop: 6,
  },
  section: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sectionGap,
  },
  settingsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  settingText: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  themeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
});
