import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import MapView, { Polyline, Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, {
  Path,
  Circle as SvgCircle,
  Line as SvgLine,
  Rect as SvgRect,
  G as SvgG,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop as SvgStop,
} from 'react-native-svg';
import { RoutePoint, ActivityType, TrackingState, PredictedMapPosition } from '@/types';
import { ACTIVITY_DEFINITIONS } from '@/constants/activity';
import { LocateFixed, Navigation, Compass, Crosshair, MapPin } from 'lucide-react-native';
import { Typography } from '@/constants/typography';
import { BorderRadius, Shadows, Spacing } from '@/constants/spacing';
import { haptics } from '@/services/haptics';
import { haversineDistance } from '@/services/calculations';
import { gpsEngine } from '@/services/gps';

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
  const mapRef = useRef<MapView | null>(null);
  const lastCameraPosRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [interpolatedPuck, setInterpolatedPuck] = useState<PredictedMapPosition | null>(null);
  const meta = ACTIVITY_DEFINITIONS[activityType] || ACTIVITY_DEFINITIONS.RUN;

  // Check if native Google Maps API Key is configured on Android
  const hasGoogleMapsApiKey = useMemo(() => {
    if (Platform.OS === 'ios') return true; // iOS uses Apple Maps natively with zero API key
    if (Platform.OS === 'web') return false;
    const key =
      Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    return typeof key === 'string' && key.trim().length > 5;
  }, []);

  const currentPoint = useMemo(() => {
    return points.length > 0 ? points[points.length - 1] : null;
  }, [points]);

  const startPoint = useMemo(() => {
    return points.length > 0 ? points[0] : null;
  }, [points]);

  // Dead reckoning puck position: updates smoothly between GPS fixes
  useEffect(() => {
    if (state !== 'TRACKING' || points.length === 0) {
      if (currentPoint) {
        setInterpolatedPuck({
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
          heading: currentPoint.heading ?? undefined,
          accuracy: currentAccuracy,
          isPredicted: false,
          timestamp: currentPoint.timestamp,
        });
      }
      return;
    }

    const interval = setInterval(() => {
      const pred = gpsEngine.getLiveMapPosition(Date.now());
      setInterpolatedPuck(pred);
    }, 200);

    return () => clearInterval(interval);
  }, [state, points.length, currentPoint, currentAccuracy]);

  // Active puck coordinate
  const activePuckCoord = interpolatedPuck || currentPoint;

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

  // Coordinate array for Polyline with optimization for long sessions
  const polylineCoords = useMemo(() => {
    if (points.length <= 500) {
      return points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
    }
    // For large routes, retain full resolution for recent 100 points and downsample historical points
    const result: { latitude: number; longitude: number }[] = [];
    const splitIndex = points.length - 100;
    for (let i = 0; i < splitIndex; i += 2) {
      result.push({ latitude: points[i].latitude, longitude: points[i].longitude });
    }
    for (let i = splitIndex; i < points.length; i++) {
      result.push({ latitude: points[i].latitude, longitude: points[i].longitude });
    }
    return result;
  }, [points]);

  // Smooth camera follow without stutter or animation thrashing
  useEffect(() => {
    if (hasGoogleMapsApiKey && !isUserInteracting && activePuckCoord && mapRef.current) {
      const last = lastCameraPosRef.current;
      const shouldAnimate =
        !last ||
        haversineDistance(last.latitude, last.longitude, activePuckCoord.latitude, activePuckCoord.longitude) >= 3;

      if (shouldAnimate) {
        lastCameraPosRef.current = {
          latitude: activePuckCoord.latitude,
          longitude: activePuckCoord.longitude,
        };
        mapRef.current.animateToRegion(
          {
            latitude: activePuckCoord.latitude,
            longitude: activePuckCoord.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          300
        );
      }
    }
  }, [activePuckCoord, isUserInteracting, hasGoogleMapsApiKey]);

  const handleRecenter = async () => {
    await haptics.selection();
    setIsUserInteracting(false);
    if (hasGoogleMapsApiKey && currentPoint && mapRef.current) {
      lastCameraPosRef.current = {
        latitude: currentPoint.latitude,
        longitude: currentPoint.longitude,
      };
      mapRef.current.animateToRegion(
        {
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        400
      );
    }
  };

  // SVG Projection for Native Vector Radar Mode (used when Google Maps API key is unconfigured on Android)
  const vectorRoute = useMemo(() => {
    if (points.length === 0) {
      return { pathD: '', startXY: null, currentXY: null, accuracyRadius: 12 };
    }

    const W = 320;
    const H = 320;
    const PAD = 40;
    const usableW = W - PAD * 2;
    const usableH = H - PAD * 2;

    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latDelta = Math.max(0.0006, maxLat - minLat);
    const lonDelta = Math.max(0.0006, maxLon - minLon);

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    const clampedMinLat = centerLat - latDelta / 2;
    const clampedMaxLat = centerLat + latDelta / 2;
    const clampedMinLon = centerLon - lonDelta / 2;
    const clampedMaxLon = centerLon + lonDelta / 2;

    const toXY = (lat: number, lon: number) => {
      const x = PAD + ((lon - clampedMinLon) / lonDelta) * usableW;
      const y = PAD + ((clampedMaxLat - lat) / latDelta) * usableH;
      return { x: Math.max(PAD / 2, Math.min(W - PAD / 2, x)), y: Math.max(PAD / 2, Math.min(H - PAD / 2, y)) };
    };

    const screenCoords = points.map((p) => toXY(p.latitude, p.longitude));
    let pathD = `M ${screenCoords[0].x.toFixed(1)} ${screenCoords[0].y.toFixed(1)}`;
    for (let i = 1; i < screenCoords.length; i++) {
      pathD += ` L ${screenCoords[i].x.toFixed(1)} ${screenCoords[i].y.toFixed(1)}`;
    }

    const startXY = screenCoords[0];
    const currentXY = screenCoords[screenCoords.length - 1];
    const accuracyRadius = Math.max(8, Math.min(28, (currentAccuracy || 10) * 1.2));

    return { pathD, startXY, currentXY, accuracyRadius };
  }, [points, currentAccuracy]);

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

  // Render Vector Radar when Google Maps key is missing on Android
  if (!hasGoogleMapsApiKey && Platform.OS === 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.radarBackground}>
          {/* Radar Polar Grid */}
          <Svg width="100%" height="100%" viewBox="0 0 320 320">
            <Defs>
              <SvgLinearGradient id="radarPulse" x1="0" y1="0" x2="1" y2="1">
                <SvgStop offset="0" stopColor={polylineColor} stopOpacity="0.3" />
                <SvgStop offset="1" stopColor="#12151B" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>

            {/* Radar Grid Circles */}
            <SvgCircle cx="160" cy="160" r="140" stroke="#1E2533" strokeWidth="1" fill="none" strokeDasharray="4,4" />
            <SvgCircle cx="160" cy="160" r="95" stroke="#1E2533" strokeWidth="1" fill="none" />
            <SvgCircle cx="160" cy="160" r="50" stroke="#1E2533" strokeWidth="1" fill="none" strokeDasharray="3,3" />

            {/* Crosshairs */}
            <SvgLine x1="160" y1="10" x2="160" y2="310" stroke="#1A202C" strokeWidth="1" strokeDasharray="2,4" />
            <SvgLine x1="10" y1="160" x2="310" y2="160" stroke="#1A202C" strokeWidth="1" strokeDasharray="2,4" />

            {/* Render Recorded Route Path */}
            {points.length >= 2 && (
              <Path
                d={vectorRoute.pathD}
                stroke={polylineColor}
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}

            {/* Start Pin */}
            {vectorRoute.startXY && (
              <SvgG>
                <SvgCircle
                  cx={vectorRoute.startXY.x}
                  cy={vectorRoute.startXY.y}
                  r="7"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </SvgG>
            )}

            {/* Live GPS Accuracy Halo & Puck */}
            {vectorRoute.currentXY && (
              <SvgG>
                <SvgCircle
                  cx={vectorRoute.currentXY.x}
                  cy={vectorRoute.currentXY.y}
                  r={vectorRoute.accuracyRadius}
                  fill="rgba(74, 222, 128, 0.15)"
                  stroke="rgba(74, 222, 128, 0.4)"
                  strokeWidth="1.2"
                />
                <SvgCircle
                  cx={vectorRoute.currentXY.x}
                  cy={vectorRoute.currentXY.y}
                  r="6"
                  fill={polylineColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </SvgG>
            )}
          </Svg>

          {/* Empty Fix Acquiring Prompt */}
          {points.length === 0 && (
            <View style={styles.emptyStateCenter}>
              <Crosshair size={32} color="#4ADE80" />
              <Text style={[Typography.labelBold, { color: '#E2E8F0', marginTop: 8 }]}>
                {state === 'TRACKING' ? 'GPS LOCKED · RECORDING ROUTE' : 'GPS READY · PRESS START'}
              </Text>
              <Text style={[Typography.caption, { color: '#94A3B8', marginTop: 2 }]}>
                Real-time high-accuracy satellite tracking
              </Text>
            </View>
          )}
        </View>

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

        {/* Vector Radar Indicator Badge (Top Right) */}
        <View style={styles.radarBadgeOverlay}>
          <View style={styles.radarBadge}>
            <Compass size={12} color="#4ADE80" />
            <Text style={[Typography.eyebrowSmall, { color: '#94A3B8', fontSize: 9, marginLeft: 4 }]}>
              VECTOR RADAR
            </Text>
          </View>
        </View>

        {/* Live Coordinate Footer (Bottom Left) */}
        {currentPoint && (
          <View style={styles.coordFooter}>
            <Text style={[Typography.caption, { color: '#64748B', fontSize: 10 }]}>
              {currentPoint.latitude.toFixed(5)}°, {currentPoint.longitude.toFixed(5)}° · {points.length} pts
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Full Native MapView on iOS (Apple Maps) or Android with API Key
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        initialRegion={initialRegion}
        showsUserLocation={false} // Custom Strava-style puck & halo
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
        {activePuckCoord && currentAccuracy && currentAccuracy > 0 && (
          <Circle
            center={{
              latitude: activePuckCoord.latitude,
              longitude: activePuckCoord.longitude,
            }}
            radius={Math.min(currentAccuracy, 40)} // Clamp visual halo to avoid massive screen takeover
            fillColor="rgba(74, 222, 128, 0.12)"
            strokeColor="rgba(74, 222, 128, 0.35)"
            strokeWidth={1}
          />
        )}

        {/* 4. Live User Location Puck */}
        {activePuckCoord && (
          <Marker
            coordinate={{
              latitude: activePuckCoord.latitude,
              longitude: activePuckCoord.longitude,
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
  radarBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#12151B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  radarBadgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  radarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 20, 24, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#2D3542',
  },
  coordFooter: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(18, 20, 24, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
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
});
export default LiveTrackingMap;
