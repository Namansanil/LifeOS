import { SurfSession } from '@/types';
import { db } from '../database';

export const surfRepository = {
  async getSurfSessions(userId: string): Promise<SurfSession[]> {
    return await db.getSurfSessions(userId);
  },

  async saveSurfSession(session: SurfSession): Promise<void> {
    await db.saveSurfSession(session);
    await db.enqueueSync('surf_sessions', session.id, 'CREATE', session);
  },
};
