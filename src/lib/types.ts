export type CategoryId =
  | 'teatro'
  | 'musica'
  | 'taller'
  | 'aire_libre'
  | 'deporte'
  | 'museo'
  | 'cuentacuentos'
  | 'otros';

export type Category = {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: 'teatro', label: 'Teatro', emoji: '🎭', color: '#A78BFA' },
  { id: 'musica', label: 'Música', emoji: '🎵', color: '#F472B6' },
  { id: 'taller', label: 'Talleres', emoji: '🎨', color: '#FBBF24' },
  { id: 'aire_libre', label: 'Aire libre', emoji: '🌳', color: '#34D399' },
  { id: 'deporte', label: 'Deporte', emoji: '⚽', color: '#60A5FA' },
  { id: 'museo', label: 'Museos', emoji: '🏛️', color: '#F97316' },
  { id: 'cuentacuentos', label: 'Cuentos', emoji: '📚', color: '#E879F9' },
  { id: 'otros', label: 'Otros', emoji: '✨', color: '#94A3B8' },
];

export function getCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export type AgeRange = { id: string; label: string; min: number; max: number };

export const AGE_RANGES: AgeRange[] = [
  { id: '0-3', label: '0-3 años', min: 0, max: 3 },
  { id: '4-6', label: '4-6 años', min: 4, max: 6 },
  { id: '7-12', label: '7-12 años', min: 7, max: 12 },
];

// Calendario del evento: un día, varias fechas sueltas o temporada continua.
export type DateMode = 'single' | 'multiple' | 'range';

export type KidsEvent = {
  id: string;
  title: string;
  description: string | null;
  category: CategoryId;
  age_min: number;
  age_max: number;
  date_mode: DateMode;
  starts_at: string;
  ends_at: string | null;
  extra_dates: string[];
  last_date: string;
  venue_name: string | null;
  address: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  price_eur: number;
  image_url: string | null;
  source_url: string | null;
};

export function formatAges(event: Pick<KidsEvent, 'age_min' | 'age_max'>): string {
  if (event.age_min <= 0 && event.age_max >= 12) return 'Todas las edades';
  return `${event.age_min}-${event.age_max} años`;
}

export function formatPrice(priceEur: number): string {
  if (!priceEur || priceEur <= 0) return 'Gratis';
  return `${priceEur.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`;
}

export function formatEventDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

type EventSchedule = Pick<KidsEvent, 'date_mode' | 'starts_at' | 'ends_at' | 'extra_dates'>;

// Todas las fechas de un evento single/multiple, ordenadas.
export function eventDates(event: EventSchedule): Date[] {
  return [event.starts_at, ...(event.extra_dates ?? [])]
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
}

// La próxima ocurrencia del evento: para ordenar la lista y para el calendario.
// En un rango ya empezado, "ahora" — el evento está abierto hoy mismo.
export function nextOccurrence(event: EventSchedule, now: Date = new Date()): Date {
  if (event.date_mode === 'range') {
    const start = new Date(event.starts_at);
    return start > now ? start : now;
  }
  const dates = eventDates(event);
  return dates.find((d) => d >= now) ?? dates[dates.length - 1];
}

const formatShortDay = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

// Texto de fechas para la tarjeta del listado.
export function formatSchedule(event: EventSchedule, now: Date = new Date()): string {
  if (event.date_mode === 'range') {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at ?? event.starts_at);
    if (start > now) return `Del ${formatShortDay(start)} al ${formatShortDay(end)}`;
    return `Abierto hasta el ${formatShortDay(end)}`;
  }
  if (event.date_mode === 'multiple') {
    const upcoming = eventDates(event).filter((d) => d >= now);
    const next = nextOccurrence(event, now);
    const extra = upcoming.length > 1 ? ` · +${upcoming.length - 1} fechas` : '';
    return `${formatEventDate(next.toISOString())}${extra}`;
  }
  return formatEventDate(event.starts_at);
}

// Líneas de fechas para la pantalla de detalle (una por fecha).
export function formatScheduleLines(event: EventSchedule, now: Date = new Date()): string[] {
  if (event.date_mode === 'range') return [formatSchedule(event, now)];
  return eventDates(event).map(
    (d) => `${formatEventDate(d.toISOString())}${d < now ? '  (pasada)' : ''}`
  );
}
