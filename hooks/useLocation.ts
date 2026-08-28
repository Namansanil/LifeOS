import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import {
  checkAllPermissions,
  requestForegroundLocationPermission,
  requestBackgroundLocationPermission,
  PermissionsStatus,
} from '@/services/permissions';

export function useLocation() {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    foregroundLocation: false,
    backgroundLocation: false,
    notifications: false,
  });
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    refreshPermissions();
  }, []);

  const refreshPermissions = async () => {
    const status = await checkAllPermissions();
    setPermissions(status);
  };

  const requestForeground = async (): Promise<boolean> => {
    const granted = await requestForegroundLocationPermission();
    await refreshPermissions();
    return granted;
  };

  const requestBackground = async (): Promise<boolean> => {
    const granted = await requestBackgroundLocationPermission();
    await refreshPermissions();
    return granted;
  };

  const getCurrentPosition = async () => {
    if (Platform.OS === 'web') {
      // Default to coastal coordinates for preview
      const fallback = { latitude: 12.9716, longitude: 77.5946 };
      setCurrentLocation(fallback);
      return fallback;
    }

    try {
      setIsLoading(true);
      const fgGranted = await requestForeground();
      if (!fgGranted) return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);
      return coords;
    } catch (err) {
      console.warn('Error fetching position:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    permissions,
    currentLocation,
    isLoading,
    refreshPermissions,
    requestForeground,
    requestBackground,
    getCurrentPosition,
  };
}
