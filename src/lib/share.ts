import * as ExpoCalendar from 'expo-calendar';
import { Linking, Platform, Share } from 'react-native';

import {
  formatAges,
  formatPrice,
  formatSchedule,
  KidsEvent,
  nextOccurrence,
} from './types';

// Abre la hoja nativa de compartir (WhatsApp, Telegram, SMS…).
export async function shareEvent(event: KidsEvent) {
  const place = [event.venue_name, event.city].filter(Boolean).join(', ');
  const lines = [
    `🎈 ${event.title}`,
    `🗓️ ${formatSchedule(event)}`,
    place ? `📍 ${place}` : null,
    `👶 ${formatAges(event)} · ${formatPrice(event.price_eur)}`,
    event.source_url,
  ].filter(Boolean) as string[];
  try {
    await Share.share({ message: lines.join('\n') });
  } catch {
    // El usuario cerró la hoja de compartir o el navegador no la soporta.
  }
}

// Añade la próxima ocurrencia del evento al calendario del dispositivo.
// En móvil abre el diálogo del sistema; en web, Google Calendar.
export async function addToCalendar(event: KidsEvent) {
  let startDate = nextOccurrence(event);
  if (event.date_mode === 'range' && startDate <= new Date()) {
    // Temporada ya abierta: proponemos mañana a las 11:00 como visita.
    startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(11, 0, 0, 0);
  }
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const location = [event.venue_name, event.address, event.city].filter(Boolean).join(', ');

  if (Platform.OS === 'web') {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const url =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      `&text=${encodeURIComponent(event.title)}` +
      `&dates=${fmt(startDate)}/${fmt(endDate)}` +
      `&location=${encodeURIComponent(location)}` +
      `&details=${encodeURIComponent(event.description ?? '')}`;
    Linking.openURL(url);
    return;
  }

  await ExpoCalendar.createEventInCalendarAsync({
    title: event.title,
    startDate,
    endDate,
    location,
    notes: event.description ?? undefined,
  });
}
