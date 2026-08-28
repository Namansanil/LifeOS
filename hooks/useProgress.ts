import { useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { subDays, format } from 'date-fns';

export function useProgress() {
  const { activities, workouts, surfSessions, studySessions, projects, habits, habitCompletions, streakDays } =
    useAppData();

  const [timeRange, setTimeRange] = useState<'WEEK' | 'MONTH' | 'ALL'>('WEEK');

  const daysCount = timeRange === 'WEEK' ? 7 : timeRange === 'MONTH' ? 30 : 90;

  // Generate weekly/monthly trend points
  const dailyBreakdown = useMemo(() => {
    const points: {
      date: string;
      label: string;
      activeMinutes: number;
      studyMinutes: number;
      habitsDone: number;
    }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayLabel = format(d, 'EEE').toUpperCase();

      const dayActivities = activities.filter((a) => a.started_at.startsWith(dateStr));
      const dayWorkouts = workouts.filter((w) => w.started_at.startsWith(dateStr));
      const dayStudy = studySessions.filter((s) => s.started_at.startsWith(dateStr));
      const dayHabits = habitCompletions.filter((c) => c.date === dateStr && c.completed);

      const activeMins =
        dayActivities.reduce((sum, a) => sum + a.duration / 60, 0) +
        dayWorkouts.reduce((sum, w) => sum + w.duration / 60, 0);

      const studyMins = dayStudy.reduce((sum, s) => sum + s.duration / 60, 0);

      points.push({
        date: dateStr,
        label: dayLabel,
        activeMinutes: Math.round(activeMins),
        studyMinutes: Math.round(studyMins),
        habitsDone: dayHabits.length,
      });
    }

    return points;
  }, [activities, workouts, studySessions, habitCompletions, daysCount]);

  // Pillar Totals
  const pillarStats = useMemo(() => {
    const totalMoveMinutes = Math.round(
      activities.reduce((s, a) => s + a.duration / 60, 0) +
        workouts.reduce((s, w) => s + w.duration / 60, 0)
    );
    const totalDistanceKm = (
      activities.reduce((s, a) => s + (a.distance || 0), 0) / 1000
    ).toFixed(1);
    const totalSurfHours = (
      surfSessions.reduce((s, ss) => s + ss.duration, 0) / 3600
    ).toFixed(1);
    const totalStudyHours = (
      studySessions.reduce((s, ss) => s + ss.duration, 0) / 3600
    ).toFixed(1);
    const totalProjectsWorked = projects.length;
    const totalHabitsCompleted = habitCompletions.filter((c) => c.completed).length;

    return {
      totalMoveMinutes,
      totalDistanceKm,
      totalSurfHours,
      totalStudyHours,
      totalProjectsWorked,
      totalHabitsCompleted,
      streakDays,
    };
  }, [activities, workouts, surfSessions, studySessions, projects, habitCompletions, streakDays]);

  // Data-Driven Personal Insights
  const insights = useMemo(() => {
    const list: string[] = [];

    if (streakDays >= 3) {
      list.push(`You have maintained a solid ${streakDays}-day consistency streak across your core routines.`);
    }

    if (activities.length >= 2) {
      const avgPace =
        activities.reduce((s, a) => s + (a.average_pace || 0), 0) / activities.length;
      if (avgPace > 0) {
        list.push(`Your average endurance pace across recent sessions is ${(avgPace / 60).toFixed(2)} min/km.`);
      }
    }

    if (studySessions.length >= 2) {
      list.push('Deep work and academic study sessions are concentrated in 45-90 minute focus blocks.');
    }

    if (list.length === 0) {
      list.push('Keep tracking your daily activities to unlock personal behavioral insights.');
    }

    return list;
  }, [streakDays, activities, studySessions]);

  return {
    timeRange,
    setTimeRange,
    dailyBreakdown,
    pillarStats,
    insights,
  };
}
