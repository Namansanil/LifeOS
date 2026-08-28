import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { AppHeader } from '@/components/common/AppHeader';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { X } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function CalendarScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { activities, workouts, habitCompletions, timelineItems } = useAppData();

  const [selectedDate, setSelectedDate] = useState(new Date());

  const currentMonthDays = eachDayOfInterval({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[Typography.eyebrow, { color: theme.primary }]}>
          LIFE CALENDAR
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[Typography.headingLarge, { color: theme.textPrimary, marginBottom: Spacing.md }]}>
          {format(new Date(), 'MMMM yyyy')}
        </Text>

        {/* Calendar Month Grid */}
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            Shadows.subtle,
          ]}
        >
          <View style={styles.daysGrid}>
            {currentMonthDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const hasActivity = activities.some((a) => a.started_at.startsWith(dateStr));
              const hasWorkout = workouts.some((w) => w.started_at.startsWith(dateStr));

              return (
                <Pressable
                  key={dateStr}
                  onPress={async () => {
                    await haptics.selection();
                    setSelectedDate(day);
                  }}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: isSelected
                        ? theme.primary
                        : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      Typography.labelBold,
                      {
                        color: isSelected
                          ? theme.primaryForeground
                          : theme.textPrimary,
                      },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {(hasActivity || hasWorkout) && (
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isSelected
                            ? theme.primaryForeground
                            : theme.primary,
                        },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected Date Summary */}
        <Text style={[Typography.eyebrow, { color: theme.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>
          ACTIVITIES FOR {format(selectedDate, 'EEEE · d MMMM').toUpperCase()}
        </Text>

        {timelineItems.length === 0 ? (
          <Text style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            No logged timeline entries for this day.
          </Text>
        ) : (
          timelineItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[Typography.labelBold, { color: theme.primary }]}>
                {item.time}
              </Text>
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <Text style={[Typography.labelBold, { color: theme.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[Typography.caption, { color: theme.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
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
  calendarCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
});
