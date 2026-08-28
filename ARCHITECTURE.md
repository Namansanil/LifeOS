# LIFEOS — SYSTEM ARCHITECTURE

## Architectural Principles
1. **Native-First**: Built with React Native & Expo for iOS and Android. Expo Web is used only for development preview.
2. **Local-First Resiliency**: All state mutations write immediately to local SQLite (`expo-sqlite`) for zero-latency, 60fps UI feedback. Operations are asynchronously synced with Supabase PostgreSQL via a transactional queue.
3. **Deterministic Hardware GPS Engine**: Explicit state machine (`IDLE` → `PREPARING` → `TRACKING` → `PAUSED` → `FINISHING` → `COMPLETED`) with Kalman/window noise filtering, battery-conscious activity profiles, and background location tasks.
4. **Honest Behavioral Modeling**: Calculations reward balance, consistency, and progress. The system never fabricates scores, PRs, or health claims.
5. **Dynamic Pillar Personalization**: Users can toggle life pillars (e.g. Move, Surf, Learn, Build, Live) to adapt the UI to their life.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE UI LAYER                    │
│  (Expo Router v4, React Native Reanimated, Gesture Handler) │
│  - Today Screen       - GPS Track Screen    - Workout Log   │
│  - Surf Session Log   - College / Study     - Projects      │
│  - Daily Review       - Progress Analytics  - Quick Add     │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                   STATE & CALCULATION ENGINE                │
│  - TanStack Query Cache  - Auth & Pillar State (Contexts)   │
│  - calculateDailyScore() - calculateReadiness()             │
│  - calculateWorkoutStats - calculateSurfStats               │
│  - Haversine / Pace / Elevation Calculation Engine          │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                    LOCAL PERSISTENCE LAYER                  │
│  - Expo SQLite (18 Relational Tables)                       │
│  - AsyncStorage (Theme, User Settings, Onboarding state)    │
│  - Transactional Sync Queue (`sync_queue`)                  │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │ (Sync background worker)
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│             CLOUD BACKEND LAYER (SUPABASE)                  │
│  - Supabase Auth (Email / Password / OAuth / Triggers)      │
│  - PostgreSQL Database (18 Tables with RLS & Indexes)       │
│  - Supabase Storage Buckets (`avatars`, `activity_routes`)  │
│  - Edge Functions (`calculate-daily-summary`, `sync-batch`) │
│  - PostgreSQL Triggers & Stored RPCs (`get_daily_summary`)  │
│  - Conflict Resolution (latest valid `updated_at` wins)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure
```
Fitness/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          (Today)
│   │   ├── activities.tsx     (Activities)
│   │   ├── projects.tsx       (Projects)
│   │   ├── progress.tsx       (Progress & Analytics)
│   │   └── profile.tsx        (Profile & Settings)
│   ├── track/
│   │   ├── index.tsx          (Sport selector)
│   │   ├── active.tsx         (Live outdoor HUD & Map)
│   │   └── summary.tsx        (Activity Summary & Save)
│   ├── fitness/
│   │   ├── index.tsx
│   │   ├── log-workout.tsx
│   │   └── workout-history.tsx
│   ├── surf/
│   │   ├── index.tsx
│   │   ├── log-session.tsx
│   │   └── history.tsx
│   ├── college/
│   │   ├── index.tsx
│   │   ├── study-timer.tsx
│   │   └── subjects.tsx
│   ├── projects/
│   │   ├── index.tsx
│   │   ├── project.tsx
│   │   └── task.tsx
│   ├── review/
│   │   ├── daily.tsx
│   │   ├── weekly.tsx
│   │   └── monthly.tsx
│   ├── calendar/
│   │   └── index.tsx
│   └── settings/
│       ├── index.tsx
│       ├── notifications.tsx
│       └── privacy.tsx
├── components/
│   ├── common/
│   ├── dashboard/
│   ├── tracking/
│   ├── fitness/
│   ├── surf/
│   ├── college/
│   ├── projects/
│   ├── lifestyle/
│   ├── charts/
│   └── calendar/
├── context/
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── AppDataContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useToday.ts
│   ├── useActivities.ts
│   ├── useHabits.ts
│   ├── useWorkout.ts
│   ├── useSurf.ts
│   ├── useCollege.ts
│   ├── useProjects.ts
│   ├── useTracking.ts
│   ├── useLocation.ts
│   └── useProgress.ts
├── services/
│   ├── supabase.ts
│   ├── database.ts
│   ├── sync.ts
│   ├── calculations.ts
│   ├── gps.ts
│   ├── haptics.ts
│   ├── notifications.ts
│   ├── permissions.ts
│   └── seedData.ts
├── types/
│   └── index.ts
├── constants/
│   ├── theme.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── activity.ts
└── supabase/
    └── schema.sql
```
