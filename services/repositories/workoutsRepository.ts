import { Workout } from '@/types';
import { db } from '../database';

export const workoutsRepository = {
  async getWorkouts(userId: string): Promise<Workout[]> {
    return await db.getWorkouts(userId);
  },

  async saveWorkout(workout: Workout): Promise<void> {
    await db.saveWorkout(workout);
    await db.enqueueSync('workouts', workout.id, 'CREATE', workout);
  },
};
