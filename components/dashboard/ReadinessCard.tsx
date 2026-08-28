import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { ScoreBadge } from '@/components/common/ScoreBadge';
import { HeartPulse } from 'lucide-react-native';

interface ReadinessCardProps {
  score: number;
  label: string;
  description: string;
}

export const ReadinessCard: React.FC<ReadinessCardProps> = ({
  score,
  label,
  description,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.surfaceElevated : theme.surface,
          borderColor: theme.border,
        },
        Shadows.subtle,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleColumn}>
          <Text style={[Typography.eyebrow, { color: theme.navy }]}>
            LIFEOS READINESS
          </Text>
          <View style={styles.scoreRow}>
            <Text style={[Typography.displayMedium, { color: theme.textPrimary }]}>
              {score}%
            </Text>
            <View style={styles.badgeWrapper}>
              <ScoreBadge label={label} variant="navy" />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: isDark ? '#172B45' : theme.navyMuted },
          ]}
        >
          <HeartPulse size={20} color={theme.navy} />
        </View>
      </View>

      <Text style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
        {description}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleColumn: {
    flex: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  badgeWrapper: {
    marginLeft: Spacing.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
