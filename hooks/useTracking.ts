import { useState, useEffect, useCallback } from 'react';
import { gpsEngine } from '@/services/gps';
import { ActivityType, RoutePoint, TrackingMetrics, TrackingState } from '@/types';
import { haptics } from '@/services/haptics';

export function useTracking() {
  const [state, setState] = useState<TrackingState>(gpsEngine.getState());
  const [metrics, setMetrics] = useState<TrackingMetrics>(gpsEngine.getMetrics());
  const [points, setPoints] = useState<RoutePoint[]>(gpsEngine.getPoints());
  const [activityType, setActivityType] = useState<ActivityType>(gpsEngine.getActivityType());

  useEffect(() => {
    const unsubscribe = gpsEngine.subscribe({
      onStateChange: (newState) => {
        setState(newState);
        setActivityType(gpsEngine.getActivityType());
      },
      onMetricsUpdate: (newMetrics) => {
        setMetrics(newMetrics);
      },
      onPointAdded: (newPoint) => {
        setPoints((prev) => [...prev, newPoint]);
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const prepare = useCallback(async (type: ActivityType) => {
    await haptics.selection();
    return await gpsEngine.prepare(type);
  }, []);

  const start = useCallback(async () => {
    await haptics.medium();
    return await gpsEngine.start();
  }, []);

  const pause = useCallback(async () => {
    await haptics.light();
    return await gpsEngine.pause();
  }, []);

  const resume = useCallback(async () => {
    await haptics.light();
    return await gpsEngine.resume();
  }, []);

  const finish = useCallback(async () => {
    await haptics.success();
    return await gpsEngine.finish();
  }, []);

  const reset = useCallback(async () => {
    await gpsEngine.reset();
  }, []);

  return {
    state,
    metrics,
    points,
    activityType,
    prepare,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
