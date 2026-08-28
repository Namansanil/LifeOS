import { StudySession, Subject } from '@/types';
import { db } from '../database';

export const learningRepository = {
  async getSubjects(userId: string): Promise<Subject[]> {
    return await db.getSubjects(userId);
  },

  async saveSubject(subject: Subject): Promise<void> {
    await db.saveSubject(subject);
    await db.enqueueSync('subjects', subject.id, 'CREATE', subject);
  },

  async getStudySessions(userId: string): Promise<StudySession[]> {
    return await db.getStudySessions(userId);
  },

  async saveStudySession(session: StudySession): Promise<void> {
    await db.saveStudySession(session);
    await db.enqueueSync('study_sessions', session.id, 'CREATE', session);
  },
};
