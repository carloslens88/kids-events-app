import { useEffect, useState } from 'react';

import { KidsEvent, nextOccurrence } from './types';

// Pronóstico de lluvia con Open-Meteo (gratuito, sin API key).
// Una sola llamada por sesión para la ciudad actual: probabilidad máxima de
// precipitación por día, 7 días vista. Con eso marcamos los eventos al aire
// libre con riesgo de lluvia.

export type RainByDate = Record<string, number>; // 'AAAA-MM-DD' → prob. %

const MADRID = { lat: 40.4168, lng: -3.7038 };

export function useRainForecast(coords?: { lat: number; lng: number } | null): RainByDate {
  const [rain, setRain] = useState<RainByDate>({});
  const lat = coords?.lat ?? MADRID.lat;
  const lng = coords?.lng ?? MADRID.lng;

  useEffect(() => {
    let cancelled = false;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
      '&daily=precipitation_probability_max&forecast_days=7&timezone=auto';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const dates: string[] = data?.daily?.time ?? [];
        const probs: number[] = data?.daily?.precipitation_probability_max ?? [];
        const map: RainByDate = {};
        dates.forEach((d, i) => {
          map[d] = probs[i] ?? 0;
        });
        setRain(map);
      })
      .catch(() => {
        // Sin pronóstico no pasa nada: simplemente no se muestra el aviso.
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return rain;
}

// Aviso de lluvia solo para eventos al aire libre cuya próxima fecha esté
// dentro del pronóstico y tenga probabilidad alta.
export function rainWarning(event: KidsEvent, rain: RainByDate): string | null {
  if (event.category !== 'aire_libre') return null;
  const next = nextOccurrence(event);
  const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
    next.getDate()
  ).padStart(2, '0')}`;
  const probability = rain[key];
  if (probability == null || probability < 50) return null;
  return `☔ Posible lluvia (${probability}%)`;
}
