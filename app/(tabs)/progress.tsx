import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useProgress } from '@/hooks/useProgress';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { AppHeader } from '@/components/common/AppHeader';
import {
  Flame,
  Footprints,
  Waves,
  GraduationCap,
  FolderGit2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function ProgressScreen() {
  const { theme, isDark } = useTheme();
  const { timeRange, setTimeRange, dailyBreakdown, pillarStats, insights } =
    useProgress();

  const maxMinutes = Math.max(
    ...dailyBreakdown.map((d) => d.activeMinutes + d.studyMinutes),
    60
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader
        title="PROGRESS"
        subtitle="Holistic performance, balance & personal trends"
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Time Range Selector */}
        <View style={styles.rangeSelectorWrapper}>
          <View
            style={[
              styles.rangeSelector,
              {
                backgroundColor: isDark ? theme.surfaceElevated : theme.surfaceSubdued,
                borderColor: theme.border,
              },
            ]}
          >
            {(['WEEK', 'MONTH', 'ALL'] as const).map((r) => {
              const isSelected = timeRange === r;
              return (
                <Pressable
                  key={r}
                  onPress={async () => {
                    await haptics.selection();
                    setTimeRange(r);
                  }}
                  style={[
                    styles.rangeButton,
                    {
                      backgroundColor: isSelected
                        ? theme.surface
                        : 'transparent',
                    },
                    isSelected ? Shadows.subtle : null,
                  ]}
                >
                  <Text
                    style={[
                      Typography.eyebrowSmall,
                      {
                        color: isSelected
                          ? theme.primary
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Streak & Consistency Hero */}
        <View
          style={[
            styles.streakHero,
            {
              backgroundColor: isDark ? '#231D12' : '#FFF9F0',
              borderColor: isDark ? '#4A3414' : '#F5D0A9',
            },
            Shadows.subtle,
          ]}
        >
          <View style={styles.streakIconWrapper}>
            <Flame size={24} color="#C25E00" />
          </View>
          <View style={styles.streakText}>
            <Text style={[Typography.eyebrow, { color: '#C25E00' }]}>
              DAILY CONSISTENCY
            </Text>
            <Text style={[Typography.displayMedium, { color: theme.textPrimary, marginTop: 2 }]}>
              {pillarStats.streakDays} <Text style={Typography.headingSmall}>DAYS STREAK</Text>
            </Text>
            <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
              Consecutive days maintaining core habits and intentional movement.
            </Text>
          </View>
        </View>

        {/* Activity Distribution Chart */}
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            Shadows.subtle,
          ]}
        >
          <Text style={[Typography.eyebrow, { color: theme.textMuted }]}>
            DAILY EFFORT (MINUTES)
          </Text>

          <View style={styles.chartBarsRow}>
            {dailyBreakdown.map((item, idx) => {
              const totalMins = item.activeMinutes + item.studyMinutes;
              const heightPct = Math.max(10, Math.min(100, (totalMins / maxMinutes) * 100));

              return (
                <View key={idx} style={styles.barColumn}>
                  <Text style={[Typography.caption, { color: theme.textMuted, fontSize: 9 }]}>
                    {totalMins > 0 ? `${totalMins}m` : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor:
                            totalMins > 0 ? theme.primary : theme.borderLight,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[Typography.eyebrowSmall, { color: theme.textSecondary, marginTop: 4 }]}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Pillar Statistics Breakdown */}
        <View style={styles.pillarsBreakdown}>
          <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: Spacing.sm }]}>
            PILLAR ACCUMULATION
          </Text>

          <View style={styles.pillarsGrid}>
            <View
              style={[
                styles.pillarStatCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.subtle,
              ]}
            >
              <Footprints size={18} color={theme.primary} />
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginTop: Spacing.sm }]}>
                MOVE
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                {pillarStats.totalDistanceKm} <Text style={Typography.caption}>km</Text>
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                {pillarStats.totalMoveMinutes} mins active
              </Text>
            </View>

            <View
              style={[
                styles.pillarStatCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.subtle,
              ]}
            >
              <Waves size={18} color="#0284C7" />
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginTop: Spacing.sm }]}>
                SURF
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                {pillarStats.totalSurfHours} <Text style={Typography.caption}>hrs</Text>
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                Ocean sessions
              </Text>
            </View>

            <View
              style={[
                styles.pillarStatCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.subtle,
              ]}
            >
              <GraduationCap size={18} color="#4338CA" />
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginTop: Spacing.sm }]}>
                LEARN
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                {pillarStats.totalStudyHours} <Text style={Typography.caption}>hrs</Text>
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                Academic focus
              </Text>
            </View>

            <View
              style={[
                styles.pillarStatCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.subtle,
              ]}
            >
              <FolderGit2 size={18} color={theme.amber} />
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted, marginTop: Spacing.sm }]}>
                BUILD
              </Text>
              <Text style={[Typography.headingMedium, { color: theme.textPrimary, marginTop: 2 }]}>
                {pillarStats.totalProjectsWorked}
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                Engineering projects
              </Text>
            </View>
          </View>
        </View>

        {/* Data-Driven Personal Insights */}
        <View style={styles.insightsSection}>
          <View style={styles.insightsHeader}>
            <Sparkles size={16} color={theme.primary} />
            <Text style={[Typography.eyebrow, { color: theme.primary, marginLeft: 6 }]}>
              DATA-DRIVEN INSIGHTS
            </Text>
          </View>

          <View style={styles.insightsList}>
            {insights.map((insight, idx) => (
              <View
                key={idx}
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: isDark
                      ? theme.surfaceElevated
                      : theme.surfaceSubdued,
                    borderColor: theme.borderLight,
                  },
                ]}
              >
                <Text style={[Typography.bodyMedium, { color: theme.textPrimary }]}>
                  {insight}
                </Text>
              </View>
            ))}
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
    paddingBottom: 100,
  },
  rangeSelectorWrapper: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xs,
  },
  rangeSelector: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  streakHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  streakIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFF0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  streakText: {
    flex: 1,
  },
  chartCard: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.md,
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 90,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: BorderRadius.full,
  },
  pillarsBreakdown: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sectionGap,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pillarStatCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  insightsSection: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sectionGap,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  insightsList: {
    gap: Spacing.sm,
  },
  insightCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
