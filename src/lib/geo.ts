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

export type LocationResult = { ok: true; coords: Coords } | { ok: false; error: string };

const GEOLOCATION_ERROR_CODES: Record<number, string> = {
  1: 'permiso denegado',
  2: 'posición no disponible',
  3: 'tiempo de espera agotado',
};

// El rechazo de navigator.geolocation es un GeolocationPositionError, que NO
// hereda de Error (así que "e instanceof Error" falla y String(e) da
// "[object Object]"): hay que leer sus campos .code/.message a mano.
function describeLocationError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const obj = e as { code?: number; message?: string };
    const known = typeof obj.code === 'number' ? GEOLOCATION_ERROR_CODES[obj.code] : undefined;
    if (obj.message && known) return `${obj.message} (${known}, código ${obj.code})`;
    if (obj.message) return obj.message;
    if (known) return `${known} (código ${obj.code})`;
  }
  return String(e);
}

// Pide permiso y devuelve la ubicación una vez, bajo demanda (p. ej. al
// pulsar un botón "mi ubicación"). A diferencia de useUserLocation, no se
// dispara solo en segundo plano: el permiso se pide como reacción directa a
// una acción del usuario, que es lo que los navegadores/SO esperan.
//
// La implementación web de expo-location tiene un fallo conocido: si el
// usuario deniega el permiso desde el diálogo nativo del navegador, su
// promesa interna no se resuelve ni falla — se queda colgada para siempre.
// Por eso todo va envuelto en un timeout de seguridad: si en 6s no hay
// respuesta, se trata como fallo en vez de dejar el botón girando
// eternamente. Devuelve el motivo exacto (mensaje del navegador/SO) para
// poder mostrarlo y diagnosticar, en vez de un genérico "no se pudo".
export async function requestUserLocation(): Promise<LocationResult> {
  try {
    const permission = await withTimeout(Location.requestForegroundPermissionsAsync(), 6000);
    if (!permission) {
      return { ok: false, error: 'El sistema no respondió a la solicitud de permiso (timeout)' };
    }
    if (permission.status !== 'granted') {
      return { ok: false, error: `Permiso no concedido (estado: ${permission.status})` };
    }
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      6000
    );
    if (!position) return { ok: false, error: 'El dispositivo no respondió con tu posición (timeout)' };
    return {
      ok: true,
      coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    };
  } catch (e) {
    return { ok: false, error: describeLocationError(e) || 'Error desconocido' };
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
