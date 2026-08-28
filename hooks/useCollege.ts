import { useAppData } from '@/context/AppDataContext';
import { StudySession, Subject } from '@/types';

export function useCollege() {
  const { subjects, studySessions, saveNewStudySession } = useAppData();

  const totalStudyMinutes = studySessions.reduce(
    (acc, s) => acc + (s.duration || 0) / 60,
    0
  );

  return {
    subjects,
    studySessions,
    totalStudyMinutes: Math.round(totalStudyMinutes),
    saveNewStudySession,
  };
}
