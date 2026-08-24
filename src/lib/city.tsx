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
    // Supabase tope un máximo duro de 1000 filas por petición pase lo que
    // pase en .limit(): con más eventos publicados que eso (ya los hay),
    // las ciudades más nuevas se quedaban fuera del selector sin ningún
    // error. Hay que paginar de verdad con .range(), no basta con pedir un
    // límite más alto.
    (async () => {
      const PAGE_SIZE = 1000;
      const citySet = new Set<string>();
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data } = await supabase
          .from('events')
          .select('city')
          .eq('status', 'published')
          .range(from, from + PAGE_SIZE - 1);
        if (!data || data.length === 0) break;
        for (const row of data) citySet.add(row.city as string);
        if (data.length < PAGE_SIZE) break;
      }
      if (citySet.size > 0) setCities([...citySet].sort());
    })();
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
