import { ActivityType, LifePillar } from '@/types';

export interface ActivityMeta {
  type: ActivityType;
  label: string;
  category: LifePillar;
  color: string;
  bgColor: string;
  iconName: string;
  isGps: boolean;
  gpsProfile: 'high' | 'balanced' | 'low';
  primaryMetric: 'PACE' | 'SPEED' | 'ELEVATION' | 'VOLUME' | 'WAVES';
  accuracyThresholdMeters: number;
  degradedAccuracyMeters: number;
  minValidSpeedMps: number;
  stopSpeedMps: number;
  resumeSpeedMps: number;
  stopConfirmationTicks: number;
  maxValidSpeedMps: number;
  maxValidJumpMeters: number;
  minMovementDeltaMeters: number;
  maxAccelerationMps2: number;
  predictionHorizonMs: number;
  splitDistanceMeters: number;
  enableSlopeCorrection: boolean;
  enableGap: boolean;
  elevationHysteresisThresholdMeters: {
    barometricOrDem: number;
    rawGps: number;
  };
  adaptiveAlpha: {
    excellent: number;
    good: number;
    degraded: number;
  };
}

export const ACTIVITY_DEFINITIONS: Record<ActivityType, ActivityMeta> = {
  RUN: {
    type: 'RUN',
    label: 'Run',
    category: 'MOVE',
    color: '#1B3B2B',
    bgColor: '#E7EFEA',
    iconName: 'footprints',
    isGps: true,
    gpsProfile: 'high',
    primaryMetric: 'PACE',
    accuracyThresholdMeters: 18,
    degradedAccuracyMeters: 35,
    minValidSpeedMps: 0.6,
    stopSpeedMps: 0.5,
    resumeSpeedMps: 0.8,
    stopConfirmationTicks: 2,
    maxValidSpeedMps: 12.0, // ~43.2 km/h
    maxValidJumpMeters: 50,
    minMovementDeltaMeters: 1.5,
    maxAccelerationMps2: 8.0,
    predictionHorizonMs: 2500,
    splitDistanceMeters: 1000,
    enableSlopeCorrection: true,
    enableGap: true,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.80,
      good: 0.65,
      degraded: 0.40,
    },
  },
  WALK: {
    type: 'WALK',
    label: 'Walk',
    category: 'MOVE',
    color: '#3D5A45',
    bgColor: '#EBF1ED',
    iconName: 'person-walking',
    isGps: true,
    gpsProfile: 'balanced',
    primaryMetric: 'PACE',
    accuracyThresholdMeters: 22,
    degradedAccuracyMeters: 40,
    minValidSpeedMps: 0.3,
    stopSpeedMps: 0.25,
    resumeSpeedMps: 0.45,
    stopConfirmationTicks: 2,
    maxValidSpeedMps: 4.5, // 16.2 km/h
    maxValidJumpMeters: 30,
    minMovementDeltaMeters: 1.0,
    maxAccelerationMps2: 4.0,
    predictionHorizonMs: 3000,
    splitDistanceMeters: 1000,
    enableSlopeCorrection: true,
    enableGap: false,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.75,
      good: 0.60,
      degraded: 0.35,
    },
  },
  CYCLE: {
    type: 'CYCLE',
    label: 'Cycling',
    category: 'MOVE',
    color: '#1B2E3D',
    bgColor: '#E5ECF2',
    iconName: 'bike',
    isGps: true,
    gpsProfile: 'high',
    primaryMetric: 'SPEED',
    accuracyThresholdMeters: 20,
    degradedAccuracyMeters: 40,
    minValidSpeedMps: 1.0,
    stopSpeedMps: 0.8,
    resumeSpeedMps: 1.3,
    stopConfirmationTicks: 2,
    maxValidSpeedMps: 32.0, // ~115 km/h
    maxValidJumpMeters: 120,
    minMovementDeltaMeters: 2.0,
    maxAccelerationMps2: 12.0,
    predictionHorizonMs: 2000,
    splitDistanceMeters: 5000,
    enableSlopeCorrection: false,
    enableGap: false,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.85,
      good: 0.70,
      degraded: 0.45,
    },
  },
  HIKE: {
    type: 'HIKE',
    label: 'Hike',
    category: 'MOVE',
    color: '#C85A32',
    bgColor: '#FAECE7',
    iconName: 'mountain',
    isGps: true,
    gpsProfile: 'high',
    primaryMetric: 'ELEVATION',
    accuracyThresholdMeters: 25,
    degradedAccuracyMeters: 45,
    minValidSpeedMps: 0.2,
    stopSpeedMps: 0.18,
    resumeSpeedMps: 0.35,
    stopConfirmationTicks: 3,
    maxValidSpeedMps: 5.5,
    maxValidJumpMeters: 35,
    minMovementDeltaMeters: 0.8,
    maxAccelerationMps2: 4.0,
    predictionHorizonMs: 3000,
    splitDistanceMeters: 1000,
    enableSlopeCorrection: true,
    enableGap: false,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.70,
      good: 0.55,
      degraded: 0.35,
    },
  },
  SURF: {
    type: 'SURF',
    label: 'Surf Session',
    category: 'SURF',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    iconName: 'waves',
    isGps: true,
    gpsProfile: 'balanced',
    primaryMetric: 'WAVES',
    accuracyThresholdMeters: 25,
    degradedAccuracyMeters: 45,
    minValidSpeedMps: 0.5,
    stopSpeedMps: 0.3,
    resumeSpeedMps: 0.6,
    stopConfirmationTicks: 2,
    maxValidSpeedMps: 20.0,
    maxValidJumpMeters: 80,
    minMovementDeltaMeters: 1.5,
    maxAccelerationMps2: 10.0,
    predictionHorizonMs: 2500,
    splitDistanceMeters: 1000,
    enableSlopeCorrection: false,
    enableGap: false,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.75,
      good: 0.60,
      degraded: 0.40,
    },
  },
  GYM: {
    type: 'GYM',
    label: 'Strength / Gym',
    category: 'MOVE',
    color: '#C25E00',
    bgColor: '#FFF0E0',
    iconName: 'dumbbell',
    isGps: false,
    gpsProfile: 'low',
    primaryMetric: 'VOLUME',
    accuracyThresholdMeters: 0,
    degradedAccuracyMeters: 0,
    minValidSpeedMps: 0,
    stopSpeedMps: 0,
    resumeSpeedMps: 0,
    stopConfirmationTicks: 1,
    maxValidSpeedMps: 0,
    maxValidJumpMeters: 0,
    minMovementDeltaMeters: 0,
    maxAccelerationMps2: 0,
    predictionHorizonMs: 0,
    splitDistanceMeters: 0,
    enableSlopeCorrection: false,
    enableGap: false,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.5,
      good: 0.5,
      degraded: 0.5,
    },
  },
  MOBILITY: {
    type: 'MOBILITY',
    label: 'Mobility & Stretch',
    category: 'MOVE',
    color: '#059669',
    bgColor: '#ECFDF5',
    iconName: 'sparkles',
    isGps: false,
    gpsProfile: 'low',
    primaryMetric: 'VOLUME',
    accuracyThresholdMeters: 0,
    degradedAccuracyMeters: 0,
    minValidSpeedMps: 0,
    stopSpeedMps: 0,
    resumeSpeedMps: 0,
    stopConfirmationTicks: 1,
    maxValidSpeedMps: 0,
    maxValidJumpMeters: 0,
    minMovementDeltaMeters: 0,
    maxAccelerationMps2: 0,
    predictionHorizonMs: 0,
    splitDistanceMeters: 0,
    enableSlopeCorrection: false,
    enableGap: false,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.5,
      good: 0.5,
      degraded: 0.5,
    },
  },
  OTHER: {
    type: 'OTHER',
    label: 'Other Physical',
    category: 'MOVE',
    color: '#475569',
    bgColor: '#F1F5F9',
    iconName: 'activity',
    isGps: false,
    gpsProfile: 'balanced',
    primaryMetric: 'PACE',
    accuracyThresholdMeters: 25,
    degradedAccuracyMeters: 40,
    minValidSpeedMps: 0.3,
    stopSpeedMps: 0.25,
    resumeSpeedMps: 0.5,
    stopConfirmationTicks: 2,
    maxValidSpeedMps: 25.0,
    maxValidJumpMeters: 50,
    minMovementDeltaMeters: 1.0,
    maxAccelerationMps2: 8.0,
    predictionHorizonMs: 2500,
    splitDistanceMeters: 1000,
    enableSlopeCorrection: false,
    enableGap: false,
    elevationHysteresisThresholdMeters: {
      barometricOrDem: 2.0,
      rawGps: 10.0,
    },
    adaptiveAlpha: {
      excellent: 0.75,
      good: 0.60,
      degraded: 0.40,
    },
  },
};

export const PILLAR_METADATA: Record<
  LifePillar,
  { label: string; description: string; color: string; bgColor: string }
> = {
  MOVE: {
    label: 'Move',
    description: 'Running, training, cycling & physical movement',
    color: '#1B3B2B',
    bgColor: '#E7EFEA',
  },
  SURF: {
    label: 'Surf',
    description: 'Ocean waves, swell quality, sessions & tide tracking',
    color: '#1B2E3D',
    bgColor: '#E5ECF2',
  },
  LEARN: {
    label: 'Learn',
    description: 'Academic subjects, online courses, deep study & certifications',
    color: '#4338CA',
    bgColor: '#EEF2FF',
  },
  BUILD: {
    label: 'Build',
    description: 'Software projects, engineering, tasks & deep work',
    color: '#C25E00',
    bgColor: '#FFF0E0',
  },
  LIVE: {
    label: 'Live',
    description: 'Routines, habits, hydration, sleep & daily balance',
    color: '#3D5A45',
    bgColor: '#EBF1ED',
  },
};
