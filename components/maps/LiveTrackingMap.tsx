import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { RoutePoint, ActivityType, TrackingState } from '@/types';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import { Navigation, LocateFixed, MapPin, Flag } from 'lucide-react-native';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/spacing';
import { haptics } from '@/services/haptics';

// Conditionally import react-native-maps for native platforms
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;
let Circle: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps.MapView;
    Polyline = Maps.Polyline;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  } catch (err) {
    console.warn('Could not load react-native-maps:', err);
  }
}

// Custom dark map styling for Apple / Google Maps matching LifeOS dark aesthetic
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#16191E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#16191E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#748096' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A0AEC0' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#718096' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1A231F' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#232936' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1B1F27' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2D3546' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0F1318' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4A5568' }],
  },
];

interface LiveTrackingMapProps {
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
  const mapRef = useRef<any>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const meta = ACTIVITY_DEFINITIONS[activityType] || ACTIVITY_DEFINITIONS.RUN;

  const currentPoint = useMemo(() => {
    return points.length > 0 ? points[points.length - 1] : null;
  }, [points]);

  const startPoint = useMemo(() => {
    return points.length > 0 ? points[0] : null;
  }, [points]);

  // Coordinate coordinates array for Polyline
  const polylineCoords = useMemo(() => {
    return points.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
  }, [points]);

  // Auto-follow camera to latest coordinate when user is not manually inspecting
  useEffect(() => {
    if (!isUserInteracting && currentPoint && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );
    }
  }, [currentPoint, isUserInteracting]);

  const handleRecenter = async () => {
    await haptics.selection();
    setIsUserInteracting(false);
    if (currentPoint && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        600
      );
    }
  };

  // Color mapping based on activity
  const polylineColor = useMemo(() => {
    switch (activityType) {
      case 'CYCLE':
        return '#38BDF8'; // Sky blue for cycling speed
      case 'HIKE':
        return '#FB923C'; // Amber for hiking trails
      case 'WALK':
        return '#A7F3D0'; // Mint for walking
      case 'SURF':
        return '#0284C7'; // Ocean blue
      case 'RUN':
      default:
        return '#4ADE80'; // Vivid emerald for running
    }
  }, [activityType]);

  // If running on Web or native maps failed to load, render SVG / Canvas Fallback
  if (Platform.OS === 'web' || !MapView) {
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
              <View style={[styles.puckDot, { backgroundColor: polylineColor }]} />
              <Text style={[Typography.caption, { color: '#E2E8F0', marginLeft: 8 }]}>
                {currentPoint?.latitude.toFixed(5)}, {currentPoint?.longitude.toFixed(5)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Initial map region
  const initialRegion = currentPoint
    ? {
        latitude: currentPoint.latitude,
        longitude: currentPoint.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      }
    : {
        latitude: 12.9716, // Default baseline coordinate
        longitude: 77.5946,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        initialRegion={initialRegion}
        showsUserLocation={false} // We render our own custom Strava-style puck & halo
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={true}
        pitchEnabled={false}
        onPanDrag={() => {
          if (!isUserInteracting) {
            setIsUserInteracting(true);
          }
        }}
      >
        {/* 1. Recorded Route Polyline */}
        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={polylineColor}
            strokeWidth={4.5}
            lineCap="round"
            lineJoin="round"
            geodesic={true}
          />
        )}

        {/* 2. Start Pin Marker */}
        {startPoint && (
          <Marker
            coordinate={{
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
            }}
            title="Start"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.startMarker}>
              <View style={styles.startMarkerInner} />
            </View>
          </Marker>
        )}

        {/* 3. GPS Accuracy Halo (Circle around current position) */}
        {currentPoint && currentAccuracy && currentAccuracy > 0 && (
          <Circle
            center={{
              latitude: currentPoint.latitude,
              longitude: currentPoint.longitude,
            }}
            radius={Math.min(currentAccuracy, 40)} // Clamp visual halo to avoid massive screen takeover
            fillColor="rgba(74, 222, 128, 0.12)"
            strokeColor="rgba(74, 222, 128, 0.35)"
            strokeWidth={1}
          />
        )}

        {/* 4. Live User Location Puck */}
        {currentPoint && (
          <Marker
            coordinate={{
              latitude: currentPoint.latitude,
              longitude: currentPoint.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
          >
            <View style={styles.puckContainer}>
              <View style={[styles.puckHaloRing, { borderColor: polylineColor }]} />
              <View style={[styles.puckCenter, { backgroundColor: polylineColor }]} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Accuracy & Points Badge (Top Left of Map) */}
      <View style={styles.hudOverlay}>
        <View style={styles.accuracyBadge}>
          <View
            style={[
              styles.accuracyDot,
              {
                backgroundColor:
                  !currentAccuracy || currentAccuracy <= meta.accuracyThresholdMeters
                    ? '#4ADE80'
                    : currentAccuracy <= 30
                    ? '#FBBF24'
                    : '#EF4444',
              },
            ]}
          />
          <Text style={[Typography.eyebrowSmall, { color: '#E2E8F0', fontSize: 10 }]}>
            {currentAccuracy ? `±${Math.round(currentAccuracy)}m GPS` : 'GPS FIX'}
          </Text>
        </View>
      </View>

      {/* Recenter Button (Appears when user manually pans away) */}
      {isUserInteracting && (
        <Pressable
          accessibilityLabel="Recenter map on current location"
          onPress={handleRecenter}
          style={({ pressed }) => [
            styles.recenterBtn,
            { opacity: pressed ? 0.85 : 1 },
            Shadows.subtle,
          ]}
        >
          <LocateFixed size={18} color="#121418" />
          <Text style={[Typography.labelBold, { color: '#121418', marginLeft: 6, fontSize: 12 }]}>
            RECENTER
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D3542',
    backgroundColor: '#16191E',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  hudOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 20, 24, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#2D3542',
  },
  accuracyDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    marginRight: 6,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ADE80',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    zIndex: 20,
  },
  startMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  startMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  puckContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puckHaloRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    opacity: 0.5,
  },
  puckCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
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
  },
});
