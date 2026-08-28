import { useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { ActivityType, Activity } from '@/types';

export function useActivities() {
  const { activities, saveNewActivity, refreshData } = useAppData();
  const [selectedType, setSelectedType] = useState<ActivityType | 'ALL'>('ALL');

  const filteredActivities = useMemo(() => {
    if (selectedType === 'ALL') return activities;
    return activities.filter((a) => a.type === selectedType);
  }, [activities, selectedType]);

  const stats = useMemo(() => {
    const totalDistanceMeters = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalDurationSeconds = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalElevationGain = activities.reduce((sum, a) => sum + (a.elevation_gain || 0), 0);
    const totalCount = activities.length;

    return {
      totalDistanceKm: (totalDistanceMeters / 1000).toFixed(1),
      totalHours: (totalDurationSeconds / 3600).toFixed(1),
      totalElevationGain: Math.round(totalElevationGain),
      totalCount,
    };
  }, [activities]);

  return {
    activities: filteredActivities,
    allActivities: activities,
    selectedType,
    setSelectedType,
    stats,
    saveNewActivity,
    refreshData,
  };
}
