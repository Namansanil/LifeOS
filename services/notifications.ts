import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function scheduleDailyReminders(preferences: {
  morningTime?: string; // HH:MM
  eveningReviewTime?: string; // HH:MM
}) {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Morning intentionality reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Good Morning · LifeOS',
        body: 'Check your readiness and set your Top 3 priorities for today.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 30,
      },
    });

    // Evening daily reflection reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Review · LifeOS',
        body: 'Take 2 minutes to reflect on today and set tomorrow’s priorities.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
  } catch (err) {
    console.warn('Error scheduling notifications:', err);
  }
}
