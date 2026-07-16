import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { AGE_RANGES, AgeRange, KidsEvent } from './types';

// Perfil de los peques del usuario: qué franjas de edad tienen sus hijos.
// Se guarda solo en el dispositivo (sin cuentas). La app usa esto para
// pre-filtrar el catálogo a lo que encaja con SUS hijos.
const STORAGE_KEY = 'kids-profile';

export type KidsProfile = {
  bandIds: string[]; // ids de AGE_RANGES, ej. ['0-3', '7-12']
  asked: boolean; // ya pasó por el onboarding (aunque lo saltara)
};

export function useKidsProfile() {
  const [profile, setProfile] = useState<KidsProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setProfile(JSON.parse(raw) as KidsProfile);
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (next: KidsProfile) => {
    setProfile(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { profile, loaded, save };
}

export function profileBands(profile: KidsProfile | null): AgeRange[] {
  if (!profile) return [];
  return AGE_RANGES.filter((r) => profile.bandIds.includes(r.id));
}

// ¿El evento encaja con alguna de las franjas de edad de los peques?
export function matchesKids(event: Pick<KidsEvent, 'age_min' | 'age_max'>, bands: AgeRange[]): boolean {
  if (bands.length === 0) return true;
  return bands.some((band) => event.age_min <= band.max && event.age_max >= band.min);
}
