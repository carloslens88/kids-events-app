import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Recordatorio semanal LOCAL (sin servidor): cada jueves a las 18:00.
// Se programa una vez desde el onboarding si el usuario acepta.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function enableWeeklyReminder(): Promise<boolean> {
  if (Platform.OS === 'web') return false; // sin notificaciones locales en web
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎈 ¿Ya tenéis plan para el finde?',
      body: 'Echa un vistazo a los nuevos planes para peques de esta semana.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 5, // 1 = domingo … 5 = jueves
      hour: 18,
      minute: 0,
    },
  });
  return true;
}

export async function disableWeeklyReminder() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
