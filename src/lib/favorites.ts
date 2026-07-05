import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

// Favoritos guardados en el dispositivo: sin cuentas ni login para el MVP.
const STORAGE_KEY = 'favorite-event-ids';

export async function getFavoriteIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function toggleFavorite(eventId: string): Promise<string[]> {
  const ids = await getFavoriteIds();
  const next = ids.includes(eventId) ? ids.filter((id) => id !== eventId) : [...ids, eventId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      getFavoriteIds().then(setFavoriteIds);
    }, [])
  );

  const toggle = useCallback(async (eventId: string) => {
    setFavoriteIds(await toggleFavorite(eventId));
  }, []);

  return { favoriteIds, toggle };
}
