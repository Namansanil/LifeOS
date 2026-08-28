import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/services/database';
import {
  Activity,
  DailyLog,
  DailyPriority,
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
  dailyLog: DailyLog | null;
  lifeScore: number;
  lifeScoreLabel: string;
  readinessScore: number;
  readinessLabel: string;
  readinessDescription: string;
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
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);

  const userId = user?.id || 'demo-user-naman';

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
        loadedLog,
      ] = await Promise.all([
        db.getHabits(userId),
        db.getHabitCompletions(userId, todayDate),
        db.getDailyPriorities(userId, todayDate),
        db.getActivities(userId),
        db.getWorkouts(userId),
        db.getSurfSessions(userId),
        db.getSubjects(userId),
        db.getStudySessions(userId),
        db.getProjects(userId),
        db.getDailyLog(userId, todayDate),
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
      setDailyLog(loadedLog);
    } catch (err) {
      console.warn('Error refreshing app data:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [userId, todayDate]);

  // Dynamic Life Score Calculation
  const { score: lifeScore, label: lifeScoreLabel } = useMemo(() => {
    return calculateDailyScore({
      priorities,
      habits,
      habitCompletions,
      activities: activities.filter((a) => a.started_at.startsWith(todayDate)),
      workouts: workouts.filter((w) => w.started_at.startsWith(todayDate)),
      surfSessions: surfSessions.filter((s) => s.started_at.startsWith(todayDate)),
      studySessions: studySessions.filter((s) => s.started_at.startsWith(todayDate)),
      projects,
    });
  }, [priorities, habits, habitCompletions, activities, workouts, surfSessions, studySessions, projects, todayDate]);

  // Dynamic Readiness Calculation
  const {
    score: readinessScore,
    label: readinessLabel,
    description: readinessDescription,
  } = useMemo(() => {
    const recentTrainingMinutes = workouts.concat(activities as any).reduce(
      (acc, item) => acc + (item.duration || 0) / 60,
      0
    );
    return calculateReadiness({
      recentDaysActivitiesCount: activities.length + workouts.length,
      recentTrainingLoadMinutes: recentTrainingMinutes,
      habitConsistencyPercent: habits.length > 0 ? (habitCompletions.length / habits.length) * 100 : 85,
      restDaysInPastWeek: 1,
      sleepHours: 7.8,
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

    // Sort chronologically ascending
    return list.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
  }, [activities, workouts, surfSessions, studySessions, subjects, todayDate]);

  // Mutations
  const toggleHabit = async (habitId: string) => {
    const isCompleted = habitCompletions.some(
      (c) => c.habit_id === habitId && c.completed
    );
    const updated = await db.toggleHabitCompletion(
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
    await db.enqueueSync('habit_completion', updated.id, 'CREATE', updated);
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
    await db.saveDailyPriorities(newList);
    await db.enqueueSync('daily_priority', updated.id, 'UPDATE', updated);
  };

  const savePriorities = async (items: DailyPriority[]) => {
    setPriorities(items);
    await db.saveDailyPriorities(items);
  };

  const saveNewActivity = async (act: Activity) => {
    await db.saveActivity(act);
    setActivities((prev) => [act, ...prev.filter((a) => a.id !== act.id)]);
    await db.enqueueSync('activity', act.id, 'CREATE', act);
  };

  const saveNewWorkout = async (w: Workout) => {
    await db.saveWorkout(w);
    setWorkouts((prev) => [w, ...prev.filter((item) => item.id !== w.id)]);
    await db.enqueueSync('workout', w.id, 'CREATE', w);
  };

  const saveNewSurfSession = async (s: SurfSession) => {
    await db.saveSurfSession(s);
    setSurfSessions((prev) => [s, ...prev.filter((item) => item.id !== s.id)]);
    await db.enqueueSync('surf_session', s.id, 'CREATE', s);
  };

  const saveNewStudySession = async (s: StudySession) => {
    await db.saveStudySession(s);
    setStudySessions((prev) => [s, ...prev]);
    await db.enqueueSync('study_session', s.id, 'CREATE', s);
  };

  const saveNewProject = async (p: Project) => {
    await db.saveProject(p);
    setProjects((prev) => [p, ...prev.filter((item) => item.id !== p.id)]);
    await db.enqueueSync('project', p.id, 'CREATE', p);
  };

  const saveNewHabit = async (h: Habit) => {
    await db.saveHabit(h);
    setHabits((prev) => [...prev, h]);
    await db.enqueueSync('habit', h.id, 'CREATE', h);
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
    await db.saveDailyLog(log);
    setDailyLog(log);
    await db.enqueueSync('daily_log', log.id, 'CREATE', log);

    // If tomorrow priorities provided
    if (tomorrowPriorities && tomorrowPriorities.length > 0) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const tomorrowItems: DailyPriority[] = tomorrowPriorities.map((title, idx) => ({
        id: `p_${tomorrow}_${idx + 1}`,
        user_id: userId,
        date: tomorrow,
        order_index: idx + 1,
        title,
        completed: false,
        category: 'LIVE',
      }));
      await db.saveDailyPriorities(tomorrowItems);
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
        dailyLog,
        lifeScore,
        lifeScoreLabel,
        readinessScore,
        readinessLabel,
        readinessDescription,
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
