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
  minValidSpeedMps: number;
  maxValidSpeedMps: number;
  maxValidJumpMeters: number;
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
    minValidSpeedMps: 0.5,
    maxValidSpeedMps: 12.0, // ~43.2 km/h
    maxValidJumpMeters: 40,
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
    minValidSpeedMps: 0.3,
    maxValidSpeedMps: 5.0, // 18 km/h
    maxValidJumpMeters: 30,
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
    minValidSpeedMps: 0.8,
    maxValidSpeedMps: 35.0, // 126 km/h
    maxValidJumpMeters: 100,
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
    minValidSpeedMps: 0.2,
    maxValidSpeedMps: 6.0,
    maxValidJumpMeters: 35,
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
    minValidSpeedMps: 0.2,
    maxValidSpeedMps: 20.0,
    maxValidJumpMeters: 60,
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
    minValidSpeedMps: 0,
    maxValidSpeedMps: 0,
    maxValidJumpMeters: 0,
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
    minValidSpeedMps: 0,
    maxValidSpeedMps: 0,
    maxValidJumpMeters: 0,
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
    minValidSpeedMps: 0,
    maxValidSpeedMps: 25.0,
    maxValidJumpMeters: 50,
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
    description: 'Academic subjects, deep study, exams & assignments',
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
