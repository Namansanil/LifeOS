import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ScoreBadge } from '@/components/common/ScoreBadge';
import { Zap } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

interface DailyScoreHeroProps {
  score: number;
  label: string;
  completedPriorities: number;
  totalPriorities: number;
  completedHabits: number;
  totalHabits: number;
  onPress?: () => void;
}

export const DailyScoreHero: React.FC<DailyScoreHeroProps> = ({
  score,
  label,
  completedPriorities,
  totalPriorities,
  completedHabits,
  totalHabits,
  onPress,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      onPress={async () => {
        if (onPress) {
          await haptics.selection();
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          transform: [{ scale: pressed && onPress ? 0.99 : 1 }],
        },
        Shadows.card,
      ]}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[Typography.eyebrow, { color: theme.textMuted }]}>
            TODAY'S PROGRESS
          </Text>
          <View style={styles.scoreRow}>
            <Text style={[Typography.displayMetric, { color: theme.textPrimary }]}>
              {score}%
            </Text>
            <View style={styles.badgeWrapper}>
              <ScoreBadge label={label} variant="primary" />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.sparkleIcon,
            { backgroundColor: isDark ? '#143823' : theme.primaryMuted },
          ]}
        >
          <Zap size={22} color={theme.primary} />
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <ProgressBar progress={score} height={8} color={theme.primary} />
      </View>

      {/* Metric Breakdown Pills */}
      <View style={[styles.bottomStats, { borderTopColor: theme.borderLight }]}>
        <View style={styles.statPill}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
            TOP 3
          </Text>
          <Text style={[Typography.labelBold, { color: theme.textPrimary, marginTop: 1 }]}>
            {completedPriorities}/{totalPriorities} DONE
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: theme.borderLight }]} />

        <View style={styles.statPill}>
          <Text style={[Typography.eyebrowSmall, { color: theme.textMuted }]}>
            HABITS
          </Text>
          <Text style={[Typography.labelBold, { color: theme.textPrimary, marginTop: 1 }]}>
            {completedHabits}/{totalHabits} COMPLETED
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  badgeWrapper: {
    marginLeft: Spacing.md,
    marginBottom: 4,
  },
  sparkleIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  bottomStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  statPill: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    marginHorizontal: Spacing.md,
  },
});
