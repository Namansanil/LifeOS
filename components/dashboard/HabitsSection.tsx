import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { Habit, HabitCompletion } from '@/types';
import { Check } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

interface HabitsSectionProps {
  habits: Habit[];
  completions: HabitCompletion[];
  onToggle: (habitId: string) => void;
}

export const HabitsSection: React.FC<HabitsSectionProps> = ({
  habits,
  completions,
  onToggle,
}) => {
  const { theme, isDark } = useTheme();

  if (habits.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[Typography.eyebrow, { color: theme.textMuted }]}>
          DAILY HABITS
        </Text>
        <Text style={[Typography.eyebrowSmall, { color: theme.textSecondary }]}>
          {completions.filter((c) => c.completed).length}/{habits.length} DONE
        </Text>
      </View>

      <View style={styles.grid}>
        {habits.map((habit) => {
          const isDone = completions.some(
            (c) => c.habit_id === habit.id && c.completed
          );

          return (
            <Pressable
              key={habit.id}
              onPress={async () => {
                await haptics.light();
                onToggle(habit.id);
              }}
              style={({ pressed }) => [
                styles.habitCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: isDone ? theme.primary : theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
                Shadows.subtle,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isDone ? theme.primary : theme.border,
                    backgroundColor: isDone ? theme.primary : 'transparent',
                  },
                ]}
              >
                {isDone ? <Check size={12} color={theme.primaryForeground} strokeWidth={3} /> : null}
              </View>

              <Text
                numberOfLines={1}
                style={[
                  Typography.labelMedium,
                  {
                    color: isDone ? theme.textMuted : theme.textPrimary,
                    textDecorationLine: isDone ? 'line-through' : 'none',
                    flex: 1,
                    marginLeft: Spacing.sm,
                  },
                ]}
              >
                {habit.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.sectionGap,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  grid: {
    gap: Spacing.sm,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
