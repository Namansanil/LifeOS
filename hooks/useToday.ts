import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { format } from 'date-fns';

export function useToday() {
  const { user } = useAuth();
  const data = useAppData();

  const formattedDate = useMemo(() => {
    return format(new Date(), 'EEEE · d MMMM').toUpperCase();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, []);

  const userName = (user?.full_name || 'ATHLETE').toUpperCase();

  const enabledPillars = user?.enabled_pillars || {
    move: true,
    surf: true,
    learn: true,
    build: true,
    live: true,
  };

  const completedPrioritiesCount = data.priorities.filter((p) => p.completed).length;
  const totalPrioritiesCount = data.priorities.length;

  const completedHabitsCount = data.habitCompletions.filter((c) => c.completed).length;
  const totalActiveHabitsCount = data.habits.filter((h) => h.active).length;

  return {
    formattedDate,
    greeting,
    userName,
    enabledPillars,
    lifeScore: data.lifeScore,
    lifeScoreLabel: data.lifeScoreLabel,
    isLifeScoreInsufficient: data.isLifeScoreInsufficient,
    readinessScore: data.readinessScore,
    readinessLabel: data.readinessLabel,
    readinessDescription: data.readinessDescription,
    isReadinessInsufficient: data.isReadinessInsufficient,
    priorities: data.priorities,
    completedPrioritiesCount,
    totalPrioritiesCount,
    habits: data.habits,
    habitCompletions: data.habitCompletions,
    completedHabitsCount,
    totalActiveHabitsCount,
    timelineItems: data.timelineItems,
    activities: data.activities,
    workouts: data.workouts,
    surfSessions: data.surfSessions,
    studySessions: data.studySessions,
    projects: data.projects,
    streakDays: data.streakDays,
    dailyLog: data.dailyLog,
    toggleHabit: data.toggleHabit,
    togglePriority: data.togglePriority,
    savePriorities: data.savePriorities,
    refreshData: data.refreshData,
  };
}
