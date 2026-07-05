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

export type KidsEvent = {
  id: string;
  title: string;
  description: string | null;
  category: CategoryId;
  age_min: number;
  age_max: number;
  starts_at: string;
  ends_at: string | null;
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
