import { useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { calculateSurfStats } from '@/services/calculations';
import { SurfSession } from '@/types';

export function useSurf() {
  const { surfSessions, saveNewSurfSession } = useAppData();

  const stats = useMemo(() => {
    return calculateSurfStats(surfSessions);
  }, [surfSessions]);

  return {
    surfSessions,
    stats,
    saveNewSurfSession,
  };
}
