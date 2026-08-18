import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'selected-city';
export const DEFAULT_CITY = 'Madrid';

// Ciudad elegida por el usuario (persistida en el dispositivo) y lista de
// ciudades disponibles, deducida de los eventos que hay en la base de datos:
// añadir eventos de una ciudad nueva hace que aparezca en el selector sola.
//
// Es un Context (no un hook local) a propósito: Explorar y Mapa necesitan
// ver la MISMA ciudad seleccionada al instante. Con un hook local, cada
// pantalla tenía su propia copia del estado y cambiar de ciudad en una no
// se notaba en la otra hasta recargar la app entera.
type CityContextValue = {
  city: string;
  setCity: (next: string) => void;
  cities: string[];
};

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
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

  return (
    <CityContext.Provider value={{ city, setCity, cities }}>{children}</CityContext.Provider>
  );
}

export function useCity(): CityContextValue {
  const value = useContext(CityContext);
  if (!value) throw new Error('useCity debe usarse dentro de <CityProvider>');
  return value;
}
