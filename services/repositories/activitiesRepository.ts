import { Activity } from '@/types';
import { db } from '../database';

export const activitiesRepository = {
  async getActivities(userId: string): Promise<Activity[]> {
    return await db.getActivities(userId);
  },

  async saveActivity(activity: Activity): Promise<void> {
    await db.saveActivity(activity);
    await db.enqueueSync('activities', activity.id, 'CREATE', activity);
  },

  async getActivityById(userId: string, id: string): Promise<Activity | null> {
    const all = await db.getActivities(userId);
    return all.find((a) => a.id === id) || null;
  },
};
