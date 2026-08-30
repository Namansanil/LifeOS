import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RoutePoint, ActivityType, TrackingState } from '@/types';
import { Navigation } from 'lucide-react-native';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

export interface LiveTrackingMapProps {
  points: RoutePoint[];
  currentAccuracy?: number;
  activityType: ActivityType;
  state: TrackingState;
  onRecenterPress?: () => void;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  points,
  currentAccuracy,
  activityType,
  state,
}) => {
  const currentPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <View style={styles.webContainer}>
      {points.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Navigation size={28} color="#4ADE80" />
          <Text style={[Typography.caption, { color: '#94A3B8', marginTop: 8 }]}>
            {state === 'TRACKING' ? 'Acquiring GPS fix...' : 'GPS Ready · Press Start'}
          </Text>
        </View>
      ) : (
        <View style={styles.webRouteView}>
          <View style={styles.webMetricsBadge}>
            <Text style={[Typography.eyebrowSmall, { color: '#4ADE80' }]}>
              {points.length} GPS POINTS RECORDED
            </Text>
            {currentAccuracy && (
              <Text style={[Typography.caption, { color: '#94A3B8' }]}>
                Accuracy: ±{Math.round(currentAccuracy)}m
              </Text>
            )}
          </View>
          <View style={styles.webCoordinatePuck}>
            <View style={styles.puckDot} />
            <Text style={[Typography.caption, { color: '#E2E8F0', marginLeft: 8 }]}>
              {currentPoint?.latitude.toFixed(5)}, {currentPoint?.longitude.toFixed(5)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#16191E',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#2D3542',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webRouteView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMetricsBadge: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  webCoordinatePuck: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F242D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  puckDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
});
export default LiveTrackingMap;
