import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'selected-city';
export const DEFAULT_CITY = 'Madrid';

// Ciudad elegida por el usuario (persistida en el dispositivo) y lista de
// ciudades disponibles, deducida de los eventos que hay en la base de datos:
// añadir eventos de una ciudad nueva hace que aparezca en el selector sola.
export function useCity() {
  const [city, setCityState] = useState<string>(DEFAULT_CITY);
  const [cities, setCities] = useState<string[]>([DEFAULT_CITY]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setCityState(saved);
    });
    if (!isSupabaseConfigured) return;
    supabase
      .from('events')
      .select('city')
      .eq('status', 'published')
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const unique = [...new Set(data.map((row) => row.city as string))].sort();
        setCities(unique);
      });
  }, []);

  const setCity = useCallback((next: string) => {
    setCityState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { city, setCity, cities };
}
