import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useToday } from '@/hooks/useToday';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { AppHeader } from '@/components/common/AppHeader';
import { DailyScoreHero } from '@/components/dashboard/DailyScoreHero';
import { ReadinessCard } from '@/components/dashboard/ReadinessCard';
import { PriorityList } from '@/components/dashboard/PriorityList';
import { HabitsSection } from '@/components/dashboard/HabitsSection';
import { TimelineSection } from '@/components/dashboard/TimelineSection';
import {
  Footprints,
  Dumbbell,
  Waves,
  GraduationCap,
  FolderGit2,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function TodayScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const today = useToday();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader
        date={today.formattedDate}
        greeting={`${today.greeting}, ${today.userName}`}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={today.refreshData}
            tintColor={theme.primary}
          />
        }
      >
        {/* Life Score Hero */}
        <DailyScoreHero
          score={today.lifeScore}
          label={today.lifeScoreLabel}
          completedPriorities={today.completedPrioritiesCount}
          totalPriorities={today.totalPrioritiesCount}
          completedHabits={today.completedHabitsCount}
          totalHabits={today.totalActiveHabitsCount}
          onPress={() => router.push('/(tabs)/progress')}
        />

        {/* Behavioral Readiness Card */}
        <ReadinessCard
          score={today.readinessScore}
          label={today.readinessLabel}
          description={today.readinessDescription}
        />

        {/* Top 3 Priorities */}
        <PriorityList
          priorities={today.priorities}
          onToggle={today.togglePriority}
          onSavePriorities={today.savePriorities}
        />

        {/* Dynamic Enabled Pillars Shortcuts */}
        <View style={styles.pillarsContainer}>
          <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: Spacing.sm }]}>
            PILLARS & MODULES
          </Text>

          <View style={styles.pillarGrid}>
            {today.enabledPillars.move && (
              <Pressable
                onPress={async () => {
                  await haptics.selection();
                  router.push('/(tabs)/activities');
                }}
                style={({ pressed }) => [
                  styles.pillarCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Shadows.subtle,
                ]}
              >
                <View style={[styles.pillarIcon, { backgroundColor: isDark ? '#143823' : theme.primaryMuted }]}>
                  <Footprints size={18} color={theme.primary} />
                </View>
                <View style={styles.pillarText}>
                  <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                    Move & Gym
                  </Text>
                  <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                    {today.activities.length} activities logged
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.textMuted} />
              </Pressable>
            )}

            {today.enabledPillars.surf && (
              <Pressable
                onPress={async () => {
                  await haptics.selection();
                  router.push('/surf');
                }}
                style={({ pressed }) => [
                  styles.pillarCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Shadows.subtle,
                ]}
              >
                <View style={[styles.pillarIcon, { backgroundColor: isDark ? '#0C2A44' : '#E0F2FE' }]}>
                  <Waves size={18} color="#0284C7" />
                </View>
                <View style={styles.pillarText}>
                  <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                    Ocean & Surf
                  </Text>
                  <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                    {today.surfSessions.length} sessions logged
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.textMuted} />
              </Pressable>
            )}

            {today.enabledPillars.learn && (
              <Pressable
                onPress={async () => {
                  await haptics.selection();
                  router.push('/college');
                }}
                style={({ pressed }) => [
                  styles.pillarCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Shadows.subtle,
                ]}
              >
                <View style={[styles.pillarIcon, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                  <GraduationCap size={18} color="#4338CA" />
                </View>
                <View style={styles.pillarText}>
                  <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                    College & Study
                  </Text>
                  <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                    {today.studySessions.length} study sessions
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.textMuted} />
              </Pressable>
            )}

            {today.enabledPillars.build && (
              <Pressable
                onPress={async () => {
                  await haptics.selection();
                  router.push('/(tabs)/projects');
                }}
                style={({ pressed }) => [
                  styles.pillarCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Shadows.subtle,
                ]}
              >
                <View style={[styles.pillarIcon, { backgroundColor: isDark ? '#3D220E' : theme.amberMuted }]}>
                  <FolderGit2 size={18} color={theme.amber} />
                </View>
                <View style={styles.pillarText}>
                  <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                    Build & Projects
                  </Text>
                  <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                    {today.projects.length} active projects
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Daily Habits */}
        <HabitsSection
          habits={today.habits}
          completions={today.habitCompletions}
          onToggle={today.toggleHabit}
        />

        {/* Daily Life Timeline */}
        <TimelineSection
          items={today.timelineItems}
          onTrackAction={() => router.push('/track')}
        />

        {/* Evening Daily Reflection Trigger */}
        <View style={styles.reviewBanner}>
          <Pressable
            onPress={async () => {
              await haptics.selection();
              router.push('/review/daily');
            }}
            style={({ pressed }) => [
              styles.reviewCard,
              {
                backgroundColor: isDark ? theme.surfaceElevated : '#1B2E3D',
                opacity: pressed ? 0.9 : 1,
              },
              Shadows.card,
            ]}
          >
            <View style={styles.reviewIconWrapper}>
              <BookOpen size={20} color="#FFFFFF" />
            </View>
            <View style={styles.reviewText}>
              <Text style={[Typography.eyebrow, { color: '#85B6FF' }]}>
                EVENING REFLECTION
              </Text>
              <Text style={[Typography.headingSmall, { color: '#FFFFFF', marginTop: 2 }]}>
                Complete Daily Review
              </Text>
              <Text style={[Typography.caption, { color: '#C8D5E5', marginTop: 2 }]}>
                Review today's score & set tomorrow's Top 3
              </Text>
            </View>
            <ChevronRight size={20} color="#FFFFFF" />
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  pillarsContainer: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sectionGap,
  },
  pillarGrid: {
    gap: Spacing.sm,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pillarIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  pillarText: {
    flex: 1,
  },
  reviewBanner: {
    marginHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.huge,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  reviewIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  reviewText: {
    flex: 1,
  },
});
