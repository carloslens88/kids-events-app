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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// Pide permiso y devuelve la ubicación una vez, bajo demanda (p. ej. al
// pulsar un botón "mi ubicación"). A diferencia de useUserLocation, no se
// dispara solo en segundo plano: el permiso se pide como reacción directa a
// una acción del usuario, que es lo que los navegadores/SO esperan.
//
// La implementación web de expo-location tiene un fallo conocido: si el
// usuario deniega el permiso desde el diálogo nativo del navegador, su
// promesa interna no se resuelve ni falla — se queda colgada para siempre.
// Por eso todo va envuelto en un timeout de seguridad: si en 10s no hay
// respuesta, se trata como "sin ubicación" en vez de dejar el botón
// girando eternamente.
export async function requestUserLocation(): Promise<Coords | null> {
  try {
    const permission = await withTimeout(Location.requestForegroundPermissionsAsync(), 10000);
    if (!permission || permission.status !== 'granted') return null;
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      10000
    );
    if (!position) return null;
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
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
