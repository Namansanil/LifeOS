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
    let fgGranted = false;
    let bgGranted = false;
    let notifGranted = false;

    try {
      const fg = await Location.getForegroundPermissionsAsync();
      fgGranted = fg.status === 'granted';
    } catch {}

    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      bgGranted = bg.status === 'granted';
    } catch {}

    try {
      const notif = await Notifications.getPermissionsAsync();
      notifGranted = notif.status === 'granted';
    } catch {}

    return {
      foregroundLocation: fgGranted,
      backgroundLocation: bgGranted,
      notifications: notifGranted,
    };
  } catch (err) {
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
