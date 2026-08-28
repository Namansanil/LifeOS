import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Activity,
  DailyLog,
  DailyPriority,
  Habit,
  HabitCompletion,
  Project,
  ProjectTask,
  RoutePoint,
  StudySession,
  Subject,
  SurfSession,
  SyncQueueItem,
  UserProfile,
  Workout,
} from '@/types';

class WebDatabase {
  private isInitialized = false;

  async init() {
    this.isInitialized = true;
  }

  private async getStorageItem<T>(key: string, defaultVal: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(`@lifeos_${key}`);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private async setStorageItem<T>(key: string, val: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`@lifeos_${key}`, JSON.stringify(val));
    } catch (e) {
      console.warn('Web storage write error:', e);
    }
  }

  // --- HABITS ---
  async getHabits(userId: string): Promise<Habit[]> {
    const habits = await this.getStorageItem<Habit[]>('habits', []);
    return habits.filter((h) => h.user_id === userId && h.active);
  }

  async saveHabit(habit: Habit): Promise<void> {
    const habits = await this.getStorageItem<Habit[]>('habits', []);
    const idx = habits.findIndex((h) => h.id === habit.id);
    if (idx >= 0) habits[idx] = habit;
    else habits.push(habit);
    await this.setStorageItem('habits', habits);
  }

  // --- HABIT COMPLETIONS ---
  async getHabitCompletions(userId: string, date: string): Promise<HabitCompletion[]> {
    const all = await this.getStorageItem<HabitCompletion[]>('habit_completions', []);
    return all.filter((c) => c.user_id === userId && c.date === date);
  }

  async toggleHabitCompletion(
    habitId: string,
    userId: string,
    date: string,
    completed: boolean
  ): Promise<HabitCompletion> {
    const item: HabitCompletion = {
      id: `${habitId}_${date}`,
      habit_id: habitId,
      user_id: userId,
      date,
      completed,
      completed_at: completed ? new Date().toISOString() : undefined,
    };

    const all = await this.getStorageItem<HabitCompletion[]>('habit_completions', []);
    const idx = all.findIndex((c) => c.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.push(item);
    await this.setStorageItem('habit_completions', all);

    return item;
  }

  // --- PRIORITIES (TOP 3) ---
  async getDailyPriorities(userId: string, date: string): Promise<DailyPriority[]> {
    const all = await this.getStorageItem<DailyPriority[]>('daily_priorities', []);
    return all
      .filter((p) => p.user_id === userId && p.date === date)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async saveDailyPriorities(priorities: DailyPriority[]): Promise<void> {
    const all = await this.getStorageItem<DailyPriority[]>('daily_priorities', []);
    const map = new Map(all.map((p) => [p.id, p]));
    for (const p of priorities) map.set(p.id, p);
    await this.setStorageItem('daily_priorities', Array.from(map.values()));
  }

  // --- ACTIVITIES ---
  async getActivities(userId: string): Promise<Activity[]> {
    const all = await this.getStorageItem<Activity[]>('activities', []);
    return all
      .filter((a) => a.user_id === userId)
      .sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  }

  async saveActivity(activity: Activity): Promise<void> {
    const all = await this.getStorageItem<Activity[]>('activities', []);
    const idx = all.findIndex((a) => a.id === activity.id);
    if (idx >= 0) all[idx] = activity;
    else all.unshift(activity);
    await this.setStorageItem('activities', all);
  }

  // --- WORKOUTS ---
  async getWorkouts(userId: string): Promise<Workout[]> {
    const all = await this.getStorageItem<Workout[]>('workouts', []);
    return all
      .filter((w) => w.user_id === userId)
      .sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  }

  async saveWorkout(workout: Workout): Promise<void> {
    const all = await this.getStorageItem<Workout[]>('workouts', []);
    const idx = all.findIndex((w) => w.id === workout.id);
    if (idx >= 0) all[idx] = workout;
    else all.unshift(workout);
    await this.setStorageItem('workouts', all);
  }

  // --- SURF SESSIONS ---
  async getSurfSessions(userId: string): Promise<SurfSession[]> {
    const all = await this.getStorageItem<SurfSession[]>('surf_sessions', []);
    return all
      .filter((s) => s.user_id === userId)
      .sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  }

  async saveSurfSession(session: SurfSession): Promise<void> {
    const all = await this.getStorageItem<SurfSession[]>('surf_sessions', []);
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) all[idx] = session;
    else all.unshift(session);
    await this.setStorageItem('surf_sessions', all);
  }

  // --- COLLEGE SUBJECTS & STUDY ---
  async getSubjects(userId: string): Promise<Subject[]> {
    const all = await this.getStorageItem<Subject[]>('subjects', []);
    return all.filter((s) => s.user_id === userId);
  }

  async saveSubject(subject: Subject): Promise<void> {
    const all = await this.getStorageItem<Subject[]>('subjects', []);
    const idx = all.findIndex((s) => s.id === subject.id);
    if (idx >= 0) all[idx] = subject;
    else all.push(subject);
    await this.setStorageItem('subjects', all);
  }

  async getStudySessions(userId: string): Promise<StudySession[]> {
    const all = await this.getStorageItem<StudySession[]>('study_sessions', []);
    return all.filter((s) => s.user_id === userId);
  }

  async saveStudySession(session: StudySession): Promise<void> {
    const all = await this.getStorageItem<StudySession[]>('study_sessions', []);
    all.unshift(session);
    await this.setStorageItem('study_sessions', all);
  }

  // --- PROJECTS & TASKS ---
  async getProjects(userId: string): Promise<Project[]> {
    const all = await this.getStorageItem<Project[]>('projects', []);
    return all.filter((p) => p.user_id === userId);
  }

  async saveProject(project: Project): Promise<void> {
    const all = await this.getStorageItem<Project[]>('projects', []);
    const idx = all.findIndex((p) => p.id === project.id);
    if (idx >= 0) all[idx] = project;
    else all.unshift(project);
    await this.setStorageItem('projects', all);
  }

  // --- DAILY LOGS (Reflection) ---
  async getDailyLog(userId: string, date: string): Promise<DailyLog | null> {
    const all = await this.getStorageItem<DailyLog[]>('daily_logs', []);
    return all.find((l) => l.user_id === userId && l.date === date) || null;
  }

  async saveDailyLog(log: DailyLog): Promise<void> {
    const all = await this.getStorageItem<DailyLog[]>('daily_logs', []);
    const idx = all.findIndex(
      (l) => l.id === log.id || (l.user_id === log.user_id && l.date === log.date)
    );
    if (idx >= 0) all[idx] = log;
    else all.push(log);
    await this.setStorageItem('daily_logs', all);
  }

  // --- GOALS & MILESTONES ---
  async getGoals(userId: string): Promise<import('@/types').Goal[]> {
    const all = await this.getStorageItem<import('@/types').Goal[]>('goals', []);
    return all.filter((g) => g.user_id === userId);
  }

  async saveGoal(goal: import('@/types').Goal): Promise<void> {
    const all = await this.getStorageItem<import('@/types').Goal[]>('goals', []);
    const idx = all.findIndex((g) => g.id === goal.id);
    if (idx >= 0) all[idx] = goal;
    else all.unshift(goal);
    await this.setStorageItem('goals', all);
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    const all = await this.getStorageItem<import('@/types').Goal[]>('goals', []);
    const filtered = all.filter((g) => !(g.id === goalId && g.user_id === userId));
    await this.setStorageItem('goals', filtered);
  }

  // --- SYNC QUEUE OPERATIONS ---
  async enqueueSync(
    entity: string,
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: any
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      entity,
      entity_id: entityId,
      operation,
      payload: JSON.stringify(payload),
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: 'PENDING',
    };
    const queue = await this.getStorageItem<SyncQueueItem[]>('sync_queue', []);
    queue.push(item);
    await this.setStorageItem('sync_queue', queue);
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const queue = await this.getStorageItem<SyncQueueItem[]>('sync_queue', []);
    return queue.filter(
      (i) => i.status === 'PENDING' || (i.status === 'FAILED' && i.retry_count < 5)
    );
  }

  async updateSyncItemStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED',
    error?: string
  ): Promise<void> {
    const queue = await this.getStorageItem<SyncQueueItem[]>('sync_queue', []);
    const item = queue.find((i) => i.id === id);
    if (item) {
      item.status = status;
      item.last_error = error;
      item.retry_count += 1;
      await this.setStorageItem('sync_queue', queue);
    }
  }
}

export const db = new WebDatabase();
