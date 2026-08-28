import { useState, useEffect, useCallback } from 'react';
import { gpsEngine } from '@/services/gps';
import {
  Activity,
  ActivitySplit,
  ActivityType,
  GPSQuality,
  RawGPSPoint,
  RoutePoint,
  TrackingMetrics,
  TrackingState,
} from '@/types';
import { haptics } from '@/services/haptics';

export function useTracking() {
  const [state, setState] = useState<TrackingState>(gpsEngine.getState());
  const [metrics, setMetrics] = useState<TrackingMetrics>(gpsEngine.getMetrics());
  const [points, setPoints] = useState<RoutePoint[]>(gpsEngine.getProcessedPoints());
  const [rawPoints, setRawPoints] = useState<RawGPSPoint[]>(gpsEngine.getRawPoints());
  const [splits, setSplits] = useState<ActivitySplit[]>(gpsEngine.getSplits());
  const [activityType, setActivityType] = useState<ActivityType>(gpsEngine.getActivityType());

  useEffect(() => {
    const unsubscribe = gpsEngine.subscribe({
      onStateChange: (newState) => {
        setState(newState);
        setActivityType(gpsEngine.getActivityType());
      },
      onMetricsUpdate: (newMetrics) => {
        setMetrics(newMetrics);
        setSplits(newMetrics.splits || []);
      },
      onPointAdded: (newPoint) => {
        setPoints((prev) => [...prev, newPoint]);
      },
      onSplitCompleted: (split) => {
        setSplits((prev) => [...prev, split]);
        haptics.medium();
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

  const finish = useCallback(async (): Promise<Activity | null> => {
    await haptics.success();
    return await gpsEngine.finish();
  }, []);

  const cancel = useCallback(async () => {
    await haptics.warning();
    await gpsEngine.cancel();
  }, []);

  const reset = useCallback(async () => {
    await gpsEngine.reset();
  }, []);

  return {
    state,
    metrics,
    points,
    rawPoints,
    splits,
    activityType,
    gpsQuality: metrics.gpsQuality,
    prepare,
    start,
    pause,
    resume,
    finish,
    cancel,
    reset,
  };
}
