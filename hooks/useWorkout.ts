import { useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { Workout, WorkoutExercise } from '@/types';
import { calculateWorkoutStats } from '@/services/calculations';

export function useWorkout() {
  const { workouts, saveNewWorkout } = useAppData();

  const totalWorkoutsCount = workouts.length;
  const totalVolumeKg = useMemo(
    () => workouts.reduce((sum, w) => sum + (w.volume || 0), 0),
    [workouts]
  );

  const getStatsForWorkout = (workout: Workout) => {
    return calculateWorkoutStats(workout, workouts);
  };

  return {
    workouts,
    totalWorkoutsCount,
    totalVolumeKg,
    getStatsForWorkout,
    saveNewWorkout,
  };
}
