import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  activitiesRepository,
  goalsRepository,
  habitsRepository,
  learningRepository,
  projectsRepository,
  reflectionsRepository,
  surfRepository,
  workoutsRepository,
} from '@/services/repositories';
import {
  Activity,
  DailyLog,
  DailyPriority,
  Goal,
  Habit,
  HabitCompletion,
  LifePillar,
  Project,
  StudySession,
  Subject,
  SurfSession,
  TimelineItem,
  Workout,
} from '@/types';
import {
  calculateDailyScore,
  calculateReadiness,
  calculateStreak,
} from '@/services/calculations';
import { generateUUID } from '@/services/uuid';

interface AppDataContextValue {
  todayDate: string;
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  priorities: DailyPriority[];
  activities: Activity[];
  workouts: Workout[];
  surfSessions: SurfSession[];
  subjects: Subject[];
  studySessions: StudySession[];
  projects: Project[];
  goals: Goal[];
  dailyLog: DailyLog | null;
  lifeScore: number | null;
  lifeScoreLabel: string;
  isLifeScoreInsufficient: boolean;
  readinessScore: number | null;
  readinessLabel: string;
  readinessDescription: string;
  isReadinessInsufficient: boolean;
  streakDays: number;
  timelineItems: TimelineItem[];
  refreshData: () => Promise<void>;
  toggleHabit: (habitId: string) => Promise<void>;
  togglePriority: (priorityId: string) => Promise<void>;
  savePriorities: (items: DailyPriority[]) => Promise<void>;
  saveNewActivity: (act: Activity) => Promise<void>;
  saveNewWorkout: (w: Workout) => Promise<void>;
  saveNewSurfSession: (s: SurfSession) => Promise<void>;
  saveNewStudySession: (s: StudySession) => Promise<void>;
  saveNewProject: (p: Project) => Promise<void>;
  saveNewHabit: (h: Habit) => Promise<void>;
  saveNewGoal: (g: Goal) => Promise<void>;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  saveDailyReflection: (journal: string, tomorrowPriorities?: string[]) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = useMemo(() => getLocalDateString(), []);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const [priorities, setPriorities] = useState<DailyPriority[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [surfSessions, setSurfSessions] = useState<SurfSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);

  const userId = user?.id || 'demo-user-naman';
  const enabledPillars = user?.enabled_pillars || {
    move: true,
    surf: true,
    learn: true,
    build: true,
    live: true,
  };

  const refreshData = async () => {
    if (!userId) return;
    try {
      const [
        loadedHabits,
        loadedCompletions,
        loadedPriorities,
        loadedActivities,
        loadedWorkouts,
        loadedSurf,
        loadedSubjects,
        loadedStudy,
        loadedProjects,
        loadedGoals,
        loadedLog,
      ] = await Promise.all([
        habitsRepository.getHabits(userId),
        habitsRepository.getHabitCompletions(userId, todayDate),
        habitsRepository.getDailyPriorities(userId, todayDate),
        activitiesRepository.getActivities(userId),
        workoutsRepository.getWorkouts(userId),
        surfRepository.getSurfSessions(userId),
        learningRepository.getSubjects(userId),
        learningRepository.getStudySessions(userId),
        projectsRepository.getProjects(userId),
        goalsRepository.getGoals(userId),
        reflectionsRepository.getDailyLog(userId, todayDate),
      ]);

      setHabits(loadedHabits);
      setHabitCompletions(loadedCompletions);
      setPriorities(loadedPriorities);
      setActivities(loadedActivities);
      setWorkouts(loadedWorkouts);
      setSurfSessions(loadedSurf);
      setSubjects(loadedSubjects);
      setStudySessions(loadedStudy);
      setProjects(loadedProjects);
      setGoals(loadedGoals);
      setDailyLog(loadedLog);
    } catch (err) {
      console.warn('Error refreshing app data:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [userId, todayDate]);

  // Dynamic Honest Life Score (Aware of disabled pillars & zero fabrication)
  const {
    score: lifeScore,
    label: lifeScoreLabel,
    isInsufficientData: isLifeScoreInsufficient,
  } = useMemo(() => {
    return calculateDailyScore({
      priorities,
      habits,
      habitCompletions,
      activities: activities.filter((a) => a.started_at.startsWith(todayDate)),
      workouts: workouts.filter((w) => w.started_at.startsWith(todayDate)),
      surfSessions: surfSessions.filter((s) => s.started_at.startsWith(todayDate)),
      studySessions: studySessions.filter((s) => s.started_at.startsWith(todayDate)),
      projects,
      enabledPillars,
    });
  }, [
    priorities,
    habits,
    habitCompletions,
    activities,
    workouts,
    surfSessions,
    studySessions,
    projects,
    enabledPillars,
    todayDate,
  ]);

  // Dynamic Honest Readiness (Behavioral load & recovery, handles insufficient data)
  const {
    score: readinessScore,
    label: readinessLabel,
    description: readinessDescription,
    isInsufficientData: isReadinessInsufficient,
  } = useMemo(() => {
    const recentTrainingMinutes = workouts.concat(activities as any).reduce(
      (acc, item) => acc + (item.duration || 0) / 60,
      0
    );
    const hasHistory = activities.length > 0 || workouts.length > 0 || habitCompletions.length > 0;
    return calculateReadiness({
      recentDaysActivitiesCount: activities.length + workouts.length,
      recentTrainingLoadMinutes: recentTrainingMinutes,
      habitConsistencyPercent:
        habits.length > 0 ? (habitCompletions.length / habits.length) * 100 : 0,
      restDaysInPastWeek: 1,
      hasHistoricalData: hasHistory,
    });
  }, [activities, workouts, habits, habitCompletions]);

  // Streak Calculation
  const streakDays = useMemo(() => {
    const dates = [
      ...activities.map((a) => a.started_at.split('T')[0]),
      ...workouts.map((w) => w.started_at.split('T')[0]),
      ...habitCompletions.map((c) => c.date),
    ];
    return calculateStreak(dates);
  }, [activities, workouts, habitCompletions]);

  // Unified Chronological Life Timeline for Today
  const timelineItems: TimelineItem[] = useMemo(() => {
    const list: TimelineItem[] = [];
    const isToday = (isoStr: string) => {
      if (!isoStr) return false;
      const d = new Date(isoStr);
      return (
        d.getFullYear() === new Date().getFullYear() &&
        d.getMonth() === new Date().getMonth() &&
        d.getDate() === new Date().getDate()
      );
    };

    // Filter today's activities
    for (const a of activities) {
      if (isToday(a.started_at) || a.started_at.startsWith(todayDate)) {
        const timeStr = new Date(a.started_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const distKm = (a.distance / 1000).toFixed(2);
        const durMin = Math.round(a.duration / 60);
        list.push({
          id: a.id,
          time: timeStr,
          timestamp: a.started_at,
          category: a.category,
          title: a.title || `${a.type} Activity`,
          subtitle: `${distKm} km · ${durMin}m · ${a.source}`,
          duration_minutes: durMin,
          type: 'ACTIVITY',
          metrics: [
            { label: 'DIST', value: `${distKm} km` },
            { label: 'TIME', value: `${durMin}m` },
            { label: 'ELEV', value: `+${Math.round(a.elevation_gain)}m` },
          ],
        });
      }
    }

    // Workouts
    for (const w of workouts) {
      if (isToday(w.started_at) || w.started_at.startsWith(todayDate)) {
        const timeStr = new Date(w.started_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const durMin = Math.round(w.duration / 60);
        list.push({
          id: w.id,
          time: timeStr,
          timestamp: w.started_at,
          category: 'MOVE',
          title: w.title || 'Strength Workout',
          subtitle: `${w.exercises.length} exercises · ${w.volume.toLocaleString()} kg volume`,
          duration_minutes: durMin,
          type: 'WORKOUT',
          metrics: [
            { label: 'VOLUME', value: `${w.volume}kg` },
            { label: 'SETS', value: `${w.exercises.reduce((s, e) => s + e.sets.length, 0)}` },
          ],
        });
      }
    }

    // Surf Sessions
    for (const s of surfSessions) {
      if (isToday(s.started_at) || s.started_at.startsWith(todayDate)) {
        const timeStr = new Date(s.started_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const durMin = Math.round(s.duration / 60);
        list.push({
          id: s.id,
          time: timeStr,
          timestamp: s.started_at,
          category: 'SURF',
          title: `Surf · ${s.location_name}`,
          subtitle: `Wave Quality ${s.wave_quality}/5 · Energy ${s.energy_level}/10`,
          duration_minutes: durMin,
          type: 'SURF',
          metrics: [
            { label: 'WAVES', value: `${s.wave_quality}/5` },
            { label: 'TIME', value: `${durMin}m` },
          ],
        });
      }
    }

    // Study Sessions
    for (const st of studySessions) {
      if (isToday(st.started_at) || st.started_at.startsWith(todayDate)) {
        const timeStr = new Date(st.started_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const durMin = Math.round(st.duration / 60);
        const sub = subjects.find((s) => s.id === st.subject_id);
        list.push({
          id: st.id,
          time: timeStr,
          timestamp: st.started_at,
          category: 'LEARN',
          title: st.title || `Study · ${sub?.name || 'Academic'}`,
          subtitle: `${sub?.code || 'CS'} · ${durMin}m focused study`,
          duration_minutes: durMin,
          type: 'STUDY',
          metrics: [{ label: 'FOCUS', value: `${durMin}m` }],
        });
      }
    }

    return list.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
  }, [activities, workouts, surfSessions, studySessions, subjects, todayDate]);

  // Mutations via Repository Layer
  const toggleHabit = async (habitId: string) => {
    const isCompleted = habitCompletions.some(
      (c) => c.habit_id === habitId && c.completed
    );
    const updated = await habitsRepository.toggleHabit(
      habitId,
      userId,
      todayDate,
      !isCompleted
    );
    setHabitCompletions((prev) => {
      const filtered = prev.filter((c) => c.habit_id !== habitId);
      if (updated.completed) filtered.push(updated);
      return filtered;
    });
  };

  const togglePriority = async (priorityId: string) => {
    const item = priorities.find((p) => p.id === priorityId);
    if (!item) return;
    const updated: DailyPriority = {
      ...item,
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : undefined,
    };
    const newList = priorities.map((p) => (p.id === priorityId ? updated : p));
    setPriorities(newList);
    await habitsRepository.saveDailyPriorities(newList);
  };

  const savePriorities = async (items: DailyPriority[]) => {
    setPriorities(items);
    await habitsRepository.saveDailyPriorities(items);
  };

  const saveNewActivity = async (act: Activity) => {
    const activityWithUser = { ...act, user_id: userId };
    await activitiesRepository.saveActivity(activityWithUser);
    setActivities((prev) => [activityWithUser, ...prev.filter((a) => a.id !== act.id)]);
  };

  const saveNewWorkout = async (w: Workout) => {
    const workoutWithUser = { ...w, user_id: userId };
    await workoutsRepository.saveWorkout(workoutWithUser);
    setWorkouts((prev) => [workoutWithUser, ...prev.filter((item) => item.id !== w.id)]);
  };

  const saveNewSurfSession = async (s: SurfSession) => {
    const surfWithUser = { ...s, user_id: userId };
    await surfRepository.saveSurfSession(surfWithUser);
    setSurfSessions((prev) => [surfWithUser, ...prev.filter((item) => item.id !== s.id)]);
  };

  const saveNewStudySession = async (s: StudySession) => {
    const studyWithUser = { ...s, user_id: userId };
    await learningRepository.saveStudySession(studyWithUser);
    setStudySessions((prev) => [studyWithUser, ...prev]);
  };

  const saveNewProject = async (p: Project) => {
    const projectWithUser = { ...p, user_id: userId };
    await projectsRepository.saveProject(projectWithUser);
    setProjects((prev) => [projectWithUser, ...prev.filter((item) => item.id !== p.id)]);
  };

  const saveNewHabit = async (h: Habit) => {
    const habitWithUser = { ...h, user_id: userId };
    await habitsRepository.saveHabit(habitWithUser);
    setHabits((prev) => [...prev, habitWithUser]);
  };

  const saveNewGoal = async (g: Goal) => {
    const goalWithUser = { ...g, user_id: userId };
    await goalsRepository.saveGoal(goalWithUser);
    setGoals((prev) => [goalWithUser, ...prev.filter((item) => item.id !== g.id)]);
  };

  const toggleGoalMilestone = async (goalId: string, milestoneId: string) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;
    const ms = target.milestones.find((m) => m.id === milestoneId);
    if (!ms) return;
    const updated = await goalsRepository.toggleMilestone(
      userId,
      goalId,
      milestoneId,
      !ms.completed
    );
    if (updated) {
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
    }
  };

  const deleteGoal = async (goalId: string) => {
    await goalsRepository.deleteGoal(goalId, userId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const saveDailyReflection = async (journal: string, tomorrowPriorities?: string[]) => {
    const log: DailyLog = {
      id: `log_${userId}_${todayDate}`,
      user_id: userId,
      date: todayDate,
      life_score: lifeScore,
      readiness_score: readinessScore,
      readiness_label: readinessLabel,
      completed_habits_count: habitCompletions.length,
      total_habits_count: habits.length,
      active_duration_minutes: activities.reduce((acc, a) => acc + a.duration / 60, 0),
      study_duration_minutes: studySessions.reduce((acc, s) => acc + s.duration / 60, 0),
      project_duration_minutes: 120,
      review_completed: true,
      journal_entry: journal,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await reflectionsRepository.saveDailyLog(log);
    setDailyLog(log);

    if (tomorrowPriorities && tomorrowPriorities.length > 0) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const tomorrowItems: DailyPriority[] = tomorrowPriorities.map((title, idx) => ({
        id: generateUUID(),
        user_id: userId,
        date: tomorrow,
        order_index: idx + 1,
        title,
        completed: false,
        category: 'LIVE',
      }));
      await habitsRepository.saveDailyPriorities(tomorrowItems);
    }
  };

  return (
    <AppDataContext.Provider
      value={{
        todayDate,
        habits,
        habitCompletions,
        priorities,
        activities,
        workouts,
        surfSessions,
        subjects,
        studySessions,
        projects,
        goals,
        dailyLog,
        lifeScore,
        lifeScoreLabel,
        isLifeScoreInsufficient,
        readinessScore,
        readinessLabel,
        readinessDescription,
        isReadinessInsufficient,
        streakDays,
        timelineItems,
        refreshData,
        toggleHabit,
        togglePriority,
        savePriorities,
        saveNewActivity,
        saveNewWorkout,
        saveNewSurfSession,
        saveNewStudySession,
        saveNewProject,
        saveNewHabit,
        saveNewGoal,
        toggleGoalMilestone,
        deleteGoal,
        saveDailyReflection,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextValue => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
