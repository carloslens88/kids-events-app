import { Alert, Linking, Platform } from 'react-native';

import { supabase } from './supabase';

// Sin acentos y en minúsculas, para comparar títulos sin depender del formato.
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

// Confirmación que funciona igual en web (window.confirm) y en móvil (Alert).
export function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sí, seguir', style: 'destructive', onPress: onConfirm },
  ]);
}

// Dirección → coordenadas usando Nominatim (OpenStreetMap, gratuito).
export async function geocodeAddress(
  address: string,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${address}, ${city}, España`);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`
  );
  const results = (await response.json()) as { lat: string; lon: string }[];
  if (!results[0]) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

// Abre una búsqueda de Google Imágenes en una pestaña nueva. No hay API de
// por medio (evita crear claves nuevas de Google Cloud a dos días de la
// publicación): el admin busca, copia la URL de la foto que le guste y la
// pega en el formulario.
export function openGoogleImageSearch(query: string) {
  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
  Linking.openURL(url);
}

// Evento ya existente en la misma ciudad con un título parecido: ayuda a
// detectar duplicados cuando el mismo evento llega importado desde dos
// fuentes distintas (Ayuntamiento + Eventbrite, por ejemplo).
export async function findPossibleDuplicate(
  title: string,
  city: string
): Promise<{ title: string; starts_at: string } | null> {
  const normalizedTitle = normalizeText(title);
  if (normalizedTitle.length < 4) return null;

  const { data } = await supabase
    .from('events')
    .select('title,starts_at')
    .eq('city', city)
    .limit(300);

  const match = (data ?? []).find((event) => {
    const other = normalizeText(event.title);
    return (
      other === normalizedTitle ||
      other.includes(normalizedTitle) ||
      normalizedTitle.includes(other)
    );
  });
  return match ?? null;
}

// Sube una imagen elegida con expo-image-picker al bucket event-images y
// devuelve su URL pública. En web el picker da un data-URL (→ blob); en
// móvil pedimos base64 al picker y lo convertimos a bytes.
export async function uploadEventImage(asset: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}): Promise<string> {
  const contentType = asset.mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const fileName = `${Date.now()}.${extension}`;

  let body: Blob | ArrayBuffer;
  if (Platform.OS === 'web') {
    body = await (await fetch(asset.uri)).blob();
  } else {
    if (!asset.base64) throw new Error('La imagen no incluye datos base64');
    const binary = atob(asset.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    body = bytes.buffer;
  }

  const { error } = await supabase.storage
    .from('event-images')
    .upload(fileName, body, { contentType, upsert: false });
  if (error) throw error;

  return supabase.storage.from('event-images').getPublicUrl(fileName).data.publicUrl;
}
