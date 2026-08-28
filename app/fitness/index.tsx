import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useWorkout } from '@/hooks/useWorkout';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { AppHeader } from '@/components/common/AppHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Dumbbell, Plus, Trophy, ChevronRight, X } from 'lucide-react-native';

export default function FitnessIndexScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { workouts, totalWorkoutsCount, totalVolumeKg } = useWorkout();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: theme.amber }]}>
          FITNESS & STRENGTH
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Stats Hero */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.subtle,
          ]}
        >
          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              WORKOUTS LOGGED
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {totalWorkoutsCount}
            </Text>
          </View>

          <View style={[styles.vDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statTile}>
            <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
              TOTAL VOLUME
            </Text>
            <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginTop: 2 }]}>
              {totalVolumeKg.toLocaleString()} <Text style={Typography.caption}>kg</Text>
            </Text>
          </View>
        </View>

        <Button
          title="Log New Workout"
          icon={<Plus size={16} color="#FFFFFF" />}
          onPress={() => router.push('/fitness/log-workout')}
          style={{ marginTop: Spacing.md }}
        />

        {/* History List */}
        <Text style={[Typography.eyebrow, { color: theme.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>
          WORKOUT HISTORY
        </Text>

        {workouts.length === 0 ? (
          <EmptyState
            icon={<Dumbbell size={24} color={theme.textMuted} />}
            title="NO WORKOUTS RECORDED"
            description="Log your gym, strength, and mobility workouts to track progressive overload."
            actionTitle="Log First Workout"
            onAction={() => router.push('/fitness/log-workout')}
          />
        ) : (
          workouts.map((w) => (
            <View
              key={w.id}
              style={[
                styles.workoutCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                Shadows.subtle,
              ]}
            >
              <View style={styles.workoutHeader}>
                <Text style={[Typography.headingSmall, { color: theme.textPrimary }]}>
                  {w.title}
                </Text>
                <Text style={[Typography.caption, { color: theme.textMuted }]}>
                  {new Date(w.started_at).toLocaleDateString()}
                </Text>
              </View>

              <Text style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                {w.exercises.length} Exercises · {w.volume.toLocaleString()} kg Total Volume
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: Spacing.screenHorizontal,
    paddingBottom: 60,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  statTile: {
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    height: 36,
  },
  workoutCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
