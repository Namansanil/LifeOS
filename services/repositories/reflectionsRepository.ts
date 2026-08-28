import { DailyLog } from '@/types';
import { db } from '../database';

export const reflectionsRepository = {
  async getDailyLog(userId: string, date: string): Promise<DailyLog | null> {
    return await db.getDailyLog(userId, date);
  },

  async saveDailyLog(log: DailyLog): Promise<void> {
    await db.saveDailyLog(log);
    await db.enqueueSync('daily_logs', log.id, 'CREATE', log);
  },
};
