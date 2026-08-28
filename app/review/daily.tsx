import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useToday } from '@/hooks/useToday';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Button } from '@/components/common/Button';
import { ScoreBadge } from '@/components/common/ScoreBadge';
import { X, CheckCircle2, BookOpen, Sun, Star } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function DailyReviewScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const today = useToday();
  const { saveDailyReflection } = useAppData();

  const [journal, setJournal] = useState(
    'Maintained high energy throughout the morning run and lower strength session. Deep work on TideWise email queue was focused.'
  );
  const [p1, setP1] = useState('Morning 5km Tempo Run');
  const [p2, setP2] = useState('Complete CS305 Algorithm assignment');
  const [p3, setP3] = useState('TideWise Docker deploy');

  const handleCompleteReview = async () => {
    await haptics.success();
    await saveDailyReflection(journal, [p1, p2, p3]);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: theme.primary }]}>
          DAILY REFLECTION
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={[Typography.headingLarge, { color: theme.textPrimary }]}>
            Day Complete
          </Text>
          <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
            Take 2 minutes to review today’s score and set your intentions for tomorrow.
          </Text>
        </View>

        {/* Day Score Summary Hero */}
        <View
          style={[
            styles.scoreCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.subtle,
          ]}
        >
          <View style={styles.scoreRow}>
            <View>
              <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
                FINAL LIFE SCORE
              </Text>
              <Text style={[Typography.displayMetric, { color: theme.textPrimary, marginTop: 2 }]}>
                {today.lifeScore}%
              </Text>
            </View>
            <ScoreBadge label={today.lifeScoreLabel} variant="primary" />
          </View>

          <View style={[styles.statsDivider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                {today.completedPrioritiesCount}/{today.totalPrioritiesCount}
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                Top 3 Done
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                {today.completedHabitsCount}/{today.totalActiveHabitsCount}
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                Habits Completed
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                {today.timelineItems.length}
              </Text>
              <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                Timeline Events
              </Text>
            </View>
          </View>
        </View>

        {/* Reflection Journal */}
        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: 6 }]}>
            HOW WAS TODAY? (JOURNAL)
          </Text>
          <TextInput
            value={journal}
            onChangeText={setJournal}
            placeholder="Reflect on wins, focus, and energy..."
            placeholderTextColor={theme.textMuted}
            multiline
            style={[
              styles.journalArea,
              {
                color: theme.textPrimary,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          />
        </View>

        {/* Tomorrow's Top 3 Priorities */}
        <View style={styles.inputGroup}>
          <Text style={[Typography.eyebrow, { color: theme.textMuted, marginBottom: 6 }]}>
            TOMORROW'S TOP 3 PRIORITIES
          </Text>

          <View style={styles.tomorrowList}>
            <View style={styles.tomorrowRow}>
              <Text style={[Typography.labelBold, { color: theme.primary, width: 30 }]}>
                01
              </Text>
              <TextInput
                value={p1}
                onChangeText={setP1}
                placeholder="Priority 1"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.priorityInput,
                  { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              />
            </View>

            <View style={styles.tomorrowRow}>
              <Text style={[Typography.labelBold, { color: theme.primary, width: 30 }]}>
                02
              </Text>
              <TextInput
                value={p2}
                onChangeText={setP2}
                placeholder="Priority 2"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.priorityInput,
                  { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              />
            </View>

            <View style={styles.tomorrowRow}>
              <Text style={[Typography.labelBold, { color: theme.primary, width: 30 }]}>
                03
              </Text>
              <TextInput
                value={p3}
                onChangeText={setP3}
                placeholder="Priority 3"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.priorityInput,
                  { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              />
            </View>
          </View>
        </View>

        <Button
          title="Complete Daily Review"
          size="large"
          onPress={handleCompleteReview}
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
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
  titleSection: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  scoreCard: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statsDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  journalArea: {
    height: 110,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  tomorrowList: {
    gap: Spacing.sm,
  },
  tomorrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
});
