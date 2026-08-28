import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useTracking } from '@/hooks/useTracking';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { formatDuration, formatPace } from '@/services/calculations';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import { Pause, Play, Square, Navigation, MapPin } from 'lucide-react-native';
import { haptics } from '@/services/haptics';

export default function ActiveTrackingScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const {
    state,
    metrics,
    activityType,
    points,
    start,
    pause,
    resume,
    finish,
  } = useTracking();

  useEffect(() => {
    if (state === 'PREPARING') {
      start();
    }
  }, [state, start]);

  const meta = ACTIVITY_DEFINITIONS[activityType] || ACTIVITY_DEFINITIONS.RUN;
  const distKm = (metrics.distanceMeters / 1000).toFixed(2);
  const timeStr = formatDuration(metrics.elapsedSeconds);
  const paceStr = formatPace(metrics.currentPaceSecKm);
  const speedKmh = (metrics.currentSpeedMps * 3.6).toFixed(1);

  const handleFinish = async () => {
    await finish();
    router.replace('/track/summary');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#121418' }]} edges={['top', 'bottom']}>
      {/* Top HUD Header */}
      <View style={styles.topHud}>
        <View style={styles.sportIndicator}>
          <View style={[styles.activeDot, { backgroundColor: state === 'TRACKING' ? '#4ADE80' : '#FB923C' }]} />
          <Text style={[Typography.eyebrow, { color: '#FFFFFF' }]}>
            {meta.label.toUpperCase()} · {state}
          </Text>
        </View>
      </View>

      {/* Primary Dominant Distance Metric */}
      <View style={styles.primaryMetricBox}>
        <Text style={[Typography.eyebrow, { color: '#94A3B8' }]}>
          DISTANCE (KM)
        </Text>
        <Text style={[Typography.displayMetric, { color: '#FFFFFF', fontSize: 64, lineHeight: 70 }]}>
          {distKm}
        </Text>
      </View>

      {/* Secondary Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={[Typography.eyebrowSmall, { color: '#94A3B8' }]}>
            TIME
          </Text>
          <Text style={[Typography.displayMetricSmall, { color: '#FFFFFF', marginTop: 4 }]}>
            {timeStr}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[Typography.eyebrowSmall, { color: '#94A3B8' }]}>
            CURRENT PACE
          </Text>
          <Text style={[Typography.displayMetricSmall, { color: '#FFFFFF', marginTop: 4 }]}>
            {paceStr.replace(' /km', '')}
          </Text>
          <Text style={[Typography.caption, { color: '#64748B' }]}>/km</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={[Typography.eyebrowSmall, { color: '#94A3B8' }]}>
            SPEED
          </Text>
          <Text style={[Typography.headingLarge, { color: '#FFFFFF', marginTop: 4 }]}>
            {speedKmh} <Text style={[Typography.caption, { color: '#64748B' }]}>km/h</Text>
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[Typography.eyebrowSmall, { color: '#94A3B8' }]}>
            ELEVATION GAIN
          </Text>
          <Text style={[Typography.headingLarge, { color: '#FFFFFF', marginTop: 4 }]}>
            +{Math.round(metrics.elevationGainMeters)}m
          </Text>
        </View>
      </View>

      {/* Live Route Preview / Status */}
      <View style={styles.mapContainer}>
        <View style={styles.mapMock}>
          <Navigation size={24} color="#4ADE80" />
          <Text style={[Typography.caption, { color: '#94A3B8', marginTop: 6 }]}>
            {points.length > 0 ? `${points.length} GPS coordinates recorded` : 'Acquiring GPS fix...'}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsBar}>
        {state === 'TRACKING' ? (
          <Pressable
            accessibilityLabel="Pause Tracking"
            onPress={pause}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: '#FB923C', transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
          >
            <Pause size={28} color="#121418" fill="#121418" />
          </Pressable>
        ) : (
          <View style={styles.pausedControls}>
            <Pressable
              accessibilityLabel="Resume Tracking"
              onPress={resume}
              style={({ pressed }) => [
                styles.controlBtn,
                { backgroundColor: '#4ADE80', transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Play size={28} color="#121418" fill="#121418" />
            </Pressable>

            <Pressable
              accessibilityLabel="Finish and Save Activity"
              onPress={handleFinish}
              style={({ pressed }) => [
                styles.controlBtn,
                { backgroundColor: '#EF4444', transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Square size={26} color="#FFFFFF" fill="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHud: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  sportIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E232B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginRight: 8,
  },
  primaryMetricBox: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.xl,
  },
  mapMock: {
    flex: 1,
    backgroundColor: '#1E232B',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#2D3542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsBar: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  pausedControls: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
