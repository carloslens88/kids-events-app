import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type Coords = { latitude: number; longitude: number };

// Distancia en km entre dos puntos (fórmula de Haversine). Suficiente para
// ordenar y mostrar distancias dentro de una ciudad sin necesitar PostGIS.
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
}

// Pide permiso de ubicación una vez y devuelve las coordenadas del usuario,
// o null si no hay permiso. La app funciona igual sin ubicación.
export function useUserLocation(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}
