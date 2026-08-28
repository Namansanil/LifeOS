import * as SQLite from 'expo-sqlite';
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

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('lifeos.db');
      await this.setupTables();
    } catch (err) {
      console.warn('SQLite native init warning, fallback to storage:', err);
    }
    this.isInitialized = true;
  }

  private async setupTables() {
    if (!this.db) return;

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        frequency TEXT NOT NULL,
        target_days TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS habit_completions (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 1,
        completed_at TEXT,
        UNIQUE(habit_id, date)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration INTEGER NOT NULL,
        distance REAL NOT NULL,
        moving_time INTEGER NOT NULL,
        elevation_gain REAL NOT NULL,
        average_speed REAL NOT NULL,
        average_pace REAL NOT NULL,
        calories INTEGER,
        source TEXT NOT NULL,
        visibility TEXT NOT NULL,
        notes TEXT,
        rating INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS route_points (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        altitude REAL,
        accuracy REAL,
        speed REAL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration INTEGER NOT NULL,
        volume REAL NOT NULL,
        rating INTEGER,
        notes TEXT,
        exercises_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS surf_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        location_name TEXT NOT NULL,
        session_type TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration INTEGER NOT NULL,
        wave_quality INTEGER NOT NULL,
        energy_level INTEGER NOT NULL,
        board_used TEXT,
        rating INTEGER NOT NULL,
        notes TEXT,
        activity_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        credits INTEGER,
        target_weekly_hours REAL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        title TEXT,
        duration INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        category TEXT,
        technologies_json TEXT,
        total_time_seconds INTEGER NOT NULL DEFAULT 0,
        next_action TEXT,
        last_worked_at TEXT,
        tasks_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS daily_priorities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        category TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, date, order_index)
      );

      CREATE TABLE IF NOT EXISTS daily_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL UNIQUE,
        life_score INTEGER NOT NULL,
        readiness_score INTEGER NOT NULL,
        readiness_label TEXT NOT NULL,
        completed_habits_count INTEGER NOT NULL,
        total_habits_count INTEGER NOT NULL,
        active_duration_minutes INTEGER NOT NULL,
        study_duration_minutes INTEGER NOT NULL,
        project_duration_minutes INTEGER NOT NULL,
        review_completed INTEGER NOT NULL,
        journal_entry TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        pillar TEXT NOT NULL,
        target_date TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        progress_percentage REAL NOT NULL DEFAULT 0,
        milestones_json TEXT,
        linked_project_ids_json TEXT,
        linked_habit_ids_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'PENDING',
        last_error TEXT
      );
    `);
  }

  // Fallback storage
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
      console.warn('Storage write error:', e);
    }
  }

  // --- HABITS ---
  async getHabits(userId: string): Promise<Habit[]> {
    await this.init();
    if (this.db) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY sort_order ASC`,
        [userId]
      );
      return rows.map((r) => ({
        ...r,
        active: Boolean(r.active),
        target_days: r.target_days ? JSON.parse(r.target_days) : undefined,
      }));
    }
    const habits = await this.getStorageItem<Habit[]>('habits', []);
    return habits.filter((h) => h.user_id === userId && h.active);
  }

  async saveHabit(habit: Habit): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO habits (id, user_id, name, category, frequency, target_days, active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          habit.id,
          habit.user_id,
          habit.name,
          habit.category,
          habit.frequency,
          habit.target_days ? JSON.stringify(habit.target_days) : null,
          habit.active ? 1 : 0,
          habit.sort_order,
          habit.created_at,
          habit.updated_at,
        ]
      );
    }
    const habits = await this.getStorageItem<Habit[]>('habits', []);
    const idx = habits.findIndex((h) => h.id === habit.id);
    if (idx >= 0) habits[idx] = habit;
    else habits.push(habit);
    await this.setStorageItem('habits', habits);
  }

  // --- HABIT COMPLETIONS ---
  async getHabitCompletions(userId: string, date: string): Promise<HabitCompletion[]> {
    await this.init();
    if (this.db) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM habit_completions WHERE user_id = ? AND date = ?`,
        [userId, date]
      );
      return rows.map((r) => ({ ...r, completed: Boolean(r.completed) }));
    }
    const all = await this.getStorageItem<HabitCompletion[]>('habit_completions', []);
    return all.filter((c) => c.user_id === userId && c.date === date);
  }

  async toggleHabitCompletion(
    habitId: string,
    userId: string,
    date: string,
    completed: boolean
  ): Promise<HabitCompletion> {
    await this.init();
    const item: HabitCompletion = {
      id: `${habitId}_${date}`,
      habit_id: habitId,
      user_id: userId,
      date,
      completed,
      completed_at: completed ? new Date().toISOString() : undefined,
    };

    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO habit_completions (id, habit_id, user_id, date, completed, completed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, item.habit_id, item.user_id, item.date, item.completed ? 1 : 0, item.completed_at || null]
      );
    }

    const all = await this.getStorageItem<HabitCompletion[]>('habit_completions', []);
    const idx = all.findIndex((c) => c.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.push(item);
    await this.setStorageItem('habit_completions', all);

    return item;
  }

  // --- PRIORITIES (TOP 3) ---
  async getDailyPriorities(userId: string, date: string): Promise<DailyPriority[]> {
    await this.init();
    if (this.db) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM daily_priorities WHERE user_id = ? AND date = ? ORDER BY order_index ASC`,
        [userId, date]
      );
      return rows.map((r) => ({ ...r, completed: Boolean(r.completed) }));
    }
    const all = await this.getStorageItem<DailyPriority[]>('daily_priorities', []);
    return all.filter((p) => p.user_id === userId && p.date === date).sort((a, b) => a.order_index - b.order_index);
  }

  async saveDailyPriorities(priorities: DailyPriority[]): Promise<void> {
    await this.init();
    for (const p of priorities) {
      if (this.db) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO daily_priorities (id, user_id, date, order_index, title, completed, completed_at, category, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.user_id,
            p.date,
            p.order_index,
            p.title,
            p.completed ? 1 : 0,
            p.completed_at || null,
            p.category || 'LIVE',
            p.date,
          ]
        );
      }
    }
    const all = await this.getStorageItem<DailyPriority[]>('daily_priorities', []);
    const map = new Map(all.map((p) => [p.id, p]));
    for (const p of priorities) map.set(p.id, p);
    await this.setStorageItem('daily_priorities', Array.from(map.values()));
  }

  // --- ACTIVITIES ---
  async getActivities(userId: string): Promise<Activity[]> {
    await this.init();
    if (this.db) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM activities WHERE user_id = ? ORDER BY started_at DESC`,
        [userId]
      );
      return rows;
    }
    const all = await this.getStorageItem<Activity[]>('activities', []);
    return all.filter((a) => a.user_id === userId).sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  }

  async saveActivity(activity: Activity): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO activities (id, user_id, type, category, title, started_at, ended_at, duration, distance, moving_time, elevation_gain, average_speed, average_pace, calories, source, visibility, notes, rating, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          activity.id,
          activity.user_id,
          activity.type,
          activity.category,
          activity.title,
          activity.started_at,
          activity.ended_at || null,
          activity.duration,
          activity.distance,
          activity.moving_time,
          activity.elevation_gain,
          activity.average_speed,
          activity.average_pace,
          activity.calories || null,
          activity.source,
          activity.visibility,
          activity.notes || null,
          activity.rating || null,
          activity.created_at,
          activity.updated_at,
        ]
      );

      if (activity.route && activity.route.length > 0) {
        for (const pt of activity.route) {
          await this.db.runAsync(
            `INSERT OR REPLACE INTO route_points (id, activity_id, latitude, longitude, altitude, accuracy, speed, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              pt.id || `${activity.id}_${pt.timestamp}`,
              activity.id,
              pt.latitude,
              pt.longitude,
              pt.altitude || null,
              pt.accuracy || null,
              pt.speed || null,
              pt.timestamp,
            ]
          );
        }
      }
    }

    const all = await this.getStorageItem<Activity[]>('activities', []);
    const idx = all.findIndex((a) => a.id === activity.id);
    if (idx >= 0) all[idx] = activity;
    else all.unshift(activity);
    await this.setStorageItem('activities', all);
  }

  // --- WORKOUTS ---
  async getWorkouts(userId: string): Promise<Workout[]> {
    await this.init();
    if (this.db) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM workouts WHERE user_id = ? ORDER BY started_at DESC`,
        [userId]
      );
      return rows.map((r) => ({
        ...r,
        exercises: r.exercises_json ? JSON.parse(r.exercises_json) : [],
      }));
    }
    const all = await this.getStorageItem<Workout[]>('workouts', []);
    return all.filter((w) => w.user_id === userId).sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  }

  async saveWorkout(workout: Workout): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO workouts (id, user_id, title, type, started_at, ended_at, duration, volume, rating, notes, exercises_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workout.id,
          workout.user_id,
          workout.title,
          workout.type,
          workout.started_at,
          workout.ended_at || null,
          workout.duration,
          workout.volume,
          workout.rating || null,
          workout.notes || null,
          JSON.stringify(workout.exercises || []),
          workout.created_at,
          workout.updated_at,
        ]
      );
    }
    const all = await this.getStorageItem<Workout[]>('workouts', []);
    const idx = all.findIndex((w) => w.id === workout.id);
    if (idx >= 0) all[idx] = workout;
    else all.unshift(workout);
    await this.setStorageItem('workouts', all);
  }

  // --- SURF SESSIONS ---
  async getSurfSessions(userId: string): Promise<SurfSession[]> {
    await this.init();
    if (this.db) {
      return await this.db.getAllAsync<SurfSession>(
        `SELECT * FROM surf_sessions WHERE user_id = ? ORDER BY started_at DESC`,
        [userId]
      );
    }
    const all = await this.getStorageItem<SurfSession[]>('surf_sessions', []);
    return all.filter((s) => s.user_id === userId).sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  }

  async saveSurfSession(session: SurfSession): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO surf_sessions (id, user_id, location_name, session_type, started_at, ended_at, duration, wave_quality, energy_level, board_used, rating, notes, activity_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.user_id,
          session.location_name,
          session.session_type,
          session.started_at,
          session.ended_at || null,
          session.duration,
          session.wave_quality,
          session.energy_level,
          session.board_used || null,
          session.rating,
          session.notes || null,
          session.activity_id || null,
          session.created_at,
          session.updated_at,
        ]
      );
    }
    const all = await this.getStorageItem<SurfSession[]>('surf_sessions', []);
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) all[idx] = session;
    else all.unshift(session);
    await this.setStorageItem('surf_sessions', all);
  }

  // --- COLLEGE SUBJECTS & STUDY ---
  async getSubjects(userId: string): Promise<Subject[]> {
    await this.init();
    if (this.db) {
      return await this.db.getAllAsync<Subject>(
        `SELECT * FROM subjects WHERE user_id = ? ORDER BY code ASC`,
        [userId]
      );
    }
    const all = await this.getStorageItem<Subject[]>('subjects', []);
    return all.filter((s) => s.user_id === userId);
  }

  async saveSubject(subject: Subject): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO subjects (id, user_id, code, name, color, credits, target_weekly_hours, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subject.id,
          subject.user_id,
          subject.code,
          subject.name,
          subject.color,
          subject.credits || 3,
          subject.target_weekly_hours || 5,
          subject.created_at,
        ]
      );
    }
    const all = await this.getStorageItem<Subject[]>('subjects', []);
    const idx = all.findIndex((s) => s.id === subject.id);
    if (idx >= 0) all[idx] = subject;
    else all.push(subject);
    await this.setStorageItem('subjects', all);
  }

  async getStudySessions(userId: string): Promise<StudySession[]> {
    await this.init();
    if (this.db) {
      return await this.db.getAllAsync<StudySession>(
        `SELECT * FROM study_sessions WHERE user_id = ? ORDER BY started_at DESC`,
        [userId]
      );
    }
    const all = await this.getStorageItem<StudySession[]>('study_sessions', []);
    return all.filter((s) => s.user_id === userId);
  }

  async saveStudySession(session: StudySession): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO study_sessions (id, user_id, subject_id, title, duration, started_at, ended_at, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.user_id,
          session.subject_id,
          session.title || null,
          session.duration,
          session.started_at,
          session.ended_at,
          session.notes || null,
          session.created_at,
        ]
      );
    }
    const all = await this.getStorageItem<StudySession[]>('study_sessions', []);
    all.unshift(session);
    await this.setStorageItem('study_sessions', all);
  }

  // --- PROJECTS & TASKS ---
  async getProjects(userId: string): Promise<Project[]> {
    await this.init();
    if (this.db) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC`,
        [userId]
      );
      return rows.map((r) => ({
        ...r,
        technologies: r.technologies_json ? JSON.parse(r.technologies_json) : [],
        tasks: r.tasks_json ? JSON.parse(r.tasks_json) : [],
      }));
    }
    const all = await this.getStorageItem<Project[]>('projects', []);
    return all.filter((p) => p.user_id === userId);
  }

  async saveProject(project: Project): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO projects (id, user_id, name, description, status, category, technologies_json, total_time_seconds, next_action, last_worked_at, tasks_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.user_id,
          project.name,
          project.description || '',
          project.status,
          project.category || null,
          JSON.stringify(project.technologies || []),
          project.total_time_seconds || 0,
          project.next_action || null,
          project.last_worked_at || null,
          JSON.stringify(project.tasks || []),
          project.created_at,
          project.updated_at,
        ]
      );
    }
    const all = await this.getStorageItem<Project[]>('projects', []);
    const idx = all.findIndex((p) => p.id === project.id);
    if (idx >= 0) all[idx] = project;
    else all.unshift(project);
    await this.setStorageItem('projects', all);
  }

  // --- DAILY LOGS (Reflection) ---
  async getDailyLog(userId: string, date: string): Promise<DailyLog | null> {
    await this.init();
    if (this.db) {
      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM daily_logs WHERE user_id = ? AND date = ?`,
        [userId, date]
      );
      if (row) {
        return {
          ...row,
          review_completed: Boolean(row.review_completed),
        };
      }
    }
    const all = await this.getStorageItem<DailyLog[]>('daily_logs', []);
    return all.find((l) => l.user_id === userId && l.date === date) || null;
  }

  async saveDailyLog(log: DailyLog): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO daily_logs (id, user_id, date, life_score, readiness_score, readiness_label, completed_habits_count, total_habits_count, active_duration_minutes, study_duration_minutes, project_duration_minutes, review_completed, journal_entry, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.id,
          log.user_id,
          log.date,
          log.life_score,
          log.readiness_score,
          log.readiness_label,
          log.completed_habits_count,
          log.total_habits_count,
          log.active_duration_minutes,
          log.study_duration_minutes,
          log.project_duration_minutes,
          log.review_completed ? 1 : 0,
          log.journal_entry || null,
          log.created_at,
          log.updated_at,
        ]
      );
    }
    const all = await this.getStorageItem<DailyLog[]>('daily_logs', []);
    const idx = all.findIndex((l) => l.id === log.id || (l.user_id === log.user_id && l.date === log.date));
    if (idx >= 0) all[idx] = log;
    else all.push(log);
    await this.setStorageItem('daily_logs', all);
  }

  // --- GOALS & MILESTONES ---
  async getGoals(userId: string): Promise<import('@/types').Goal[]> {
    await this.init();
    if (this.db) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      );
      return rows.map((r) => ({
        ...r,
        milestones: r.milestones_json ? JSON.parse(r.milestones_json) : [],
        linked_project_ids: r.linked_project_ids_json ? JSON.parse(r.linked_project_ids_json) : [],
        linked_habit_ids: r.linked_habit_ids_json ? JSON.parse(r.linked_habit_ids_json) : [],
      }));
    }
    const all = await this.getStorageItem<import('@/types').Goal[]>('goals', []);
    return all.filter((g) => g.user_id === userId);
  }

  async saveGoal(goal: import('@/types').Goal): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO goals (id, user_id, title, description, pillar, target_date, status, progress_percentage, milestones_json, linked_project_ids_json, linked_habit_ids_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          goal.id,
          goal.user_id,
          goal.title,
          goal.description || null,
          goal.pillar,
          goal.target_date || null,
          goal.status,
          goal.progress_percentage || 0,
          JSON.stringify(goal.milestones || []),
          JSON.stringify(goal.linked_project_ids || []),
          JSON.stringify(goal.linked_habit_ids || []),
          goal.created_at,
          goal.updated_at,
        ]
      );
    }
    const all = await this.getStorageItem<import('@/types').Goal[]>('goals', []);
    const idx = all.findIndex((g) => g.id === goal.id);
    if (idx >= 0) all[idx] = goal;
    else all.unshift(goal);
    await this.setStorageItem('goals', all);
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(`DELETE FROM goals WHERE id = ? AND user_id = ?`, [goalId, userId]);
    }
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
    await this.init();
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

    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO sync_queue (id, entity, entity_id, operation, payload, created_at, retry_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.entity, item.entity_id, item.operation, item.payload, item.created_at, 0, 'PENDING']
      );
    }
    const queue = await this.getStorageItem<SyncQueueItem[]>('sync_queue', []);
    queue.push(item);
    await this.setStorageItem('sync_queue', queue);
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    await this.init();
    if (this.db) {
      return await this.db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue WHERE status = 'PENDING' OR (status = 'FAILED' AND retry_count < 5) ORDER BY created_at ASC`
      );
    }
    const queue = await this.getStorageItem<SyncQueueItem[]>('sync_queue', []);
    return queue.filter((i) => i.status === 'PENDING' || (i.status === 'FAILED' && i.retry_count < 5));
  }

  async updateSyncItemStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED',
    error?: string
  ): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync(
        `UPDATE sync_queue SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
        [status, error || null, id]
      );
    }
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

export const db = new LocalDatabase();
