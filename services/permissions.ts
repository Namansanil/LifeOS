import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface PermissionsStatus {
  foregroundLocation: boolean;
  backgroundLocation: boolean;
  notifications: boolean;
}

export async function checkAllPermissions(): Promise<PermissionsStatus> {
  if (Platform.OS === 'web') {
    return {
      foregroundLocation: true,
      backgroundLocation: false,
      notifications: false,
    };
  }

  try {
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    const notif = await Notifications.getPermissionsAsync();

    return {
      foregroundLocation: fg.status === 'granted',
      backgroundLocation: bg.status === 'granted',
      notifications: notif.status === 'granted',
    };
  } catch (err) {
    console.warn('Error checking permissions:', err);
    return {
      foregroundLocation: false,
      backgroundLocation: false,
      notifications: false,
    };
  }
}

export async function requestForegroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Error requesting foreground location:', err);
    return false;
  }
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const fg = await requestForegroundLocationPermission();
    if (!fg) return false;

    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Error requesting background location:', err);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Error requesting notifications:', err);
    return false;
  }
}
