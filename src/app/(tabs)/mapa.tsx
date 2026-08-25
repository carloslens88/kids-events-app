import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventsMap } from '@/components/events-map';
import { SetupNotice } from '@/components/setup-notice';
import { cardShadow, colors, fonts, radius } from '@/constants/theme';
import { useCity } from '@/lib/city';
import { Coords, distanceKm, requestUserLocation } from '@/lib/geo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { KidsEvent } from '@/lib/types';

// Radio de "esta zona" al buscar cerca de un punto que no coincide con
// ninguna ciudad soportada — suficiente para cubrir el área metropolitana
// de una ciudad sin traer eventos de la otra punta del país.
const NEARBY_RADIUS_KM = 60;
// Caja de búsqueda en grados un poco holgada respecto al radio real: filtra
// en el servidor lo grueso, distanceKm() afina luego el radio exacto.
const BOX_DEGREES = 1;

export default function MapScreen() {
  const [cityEvents, setCityEvents] = useState<KidsEvent[]>([]);
  const [areaEvents, setAreaEvents] = useState<KidsEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [searchingArea, setSearchingArea] = useState(false);
  const [centerOn, setCenterOn] = useState<{ lat: number; lng: number } | null>(null);
  // Punto sobre el que ofrecer "buscar en esta zona": lo pone tanto
  // localizar (GPS) como arrastrar/hacer zoom en el mapa a mano.
  const [searchPoint, setSearchPoint] = useState<{ lat: number; lng: number } | null>(null);
  const { city } = useCity();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseConfigured) return;
      supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .eq('city', city)
        .gte('last_date', new Date().toISOString())
        .limit(200)
        .then(({ data }) => {
          setCityEvents((data as KidsEvent[]) ?? []);
          setLoading(false);
        });
      // Cambiar de ciudad (desde el selector) vuelve a la vista normal de esa
      // ciudad, sale del modo "buscar en esta zona" si estaba activo.
      setAreaEvents(null);
      setSearchPoint(null);
    }, [city])
  );

  const handleLocate = async () => {
    setLocating(true);
    const result = await requestUserLocation();
    setLocating(false);
    if (!result.ok) {
      // Alert.alert no muestra nada en web (lección ya aprendida en el
      // panel de admin con confirmAction): ahí usamos window.alert.
      const message = `No hemos podido acceder a tu ubicación.\n\nMotivo: ${result.error}`;
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Sin acceso a tu ubicación', message);
      return;
    }
    setAreaEvents(null); // localizar solo mueve el mapa; buscar es una acción aparte
    const point = { lat: result.coords.latitude, lng: result.coords.longitude };
    setCenterOn(point);
    setSearchPoint(point);
  };

  // El mapa avisa (vía postMessage) cuando el usuario lo arrastra o hace
  // zoom a mano — no cuando lo movemos nosotros por código (fitBounds,
  // centerOn...), eso ya lo filtra map-html.ts.
  const handleMapMoved = useCallback((point: { lat: number; lng: number }) => {
    setSearchPoint(point);
  }, []);

  // No hay PostGIS: se acota primero con una caja de lat/lng (barato, usa
  // los índices normales) y se afina la distancia real en el cliente, igual
  // que ya se hace para la distancia mostrada en las tarjetas de evento.
  const handleSearchArea = async () => {
    if (!searchPoint) return;
    setSearchingArea(true);
    const point: Coords = { latitude: searchPoint.lat, longitude: searchPoint.lng };
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('last_date', new Date().toISOString())
      .gte('lat', searchPoint.lat - BOX_DEGREES)
      .lte('lat', searchPoint.lat + BOX_DEGREES)
      .gte('lng', searchPoint.lng - BOX_DEGREES)
      .lte('lng', searchPoint.lng + BOX_DEGREES)
      .limit(500);
    const nearby = ((data as KidsEvent[]) ?? []).filter(
      (e) => e.lat != null && e.lng != null && distanceKm(point, { latitude: e.lat!, longitude: e.lng! }) <= NEARBY_RADIUS_KM
    );
    setAreaEvents(nearby);
    setSearchingArea(false);
  };

  if (!isSupabaseConfigured) return <SetupNotice />;

  const showingArea = areaEvents !== null;
  const visibleEvents = showingArea ? areaEvents : cityEvents;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      ) : (
        <>
          <EventsMap
            events={visibleEvents}
            city={city}
            centerOn={centerOn}
            fallbackCenter={showingArea && searchPoint ? [searchPoint.lat, searchPoint.lng] : null}
            onMapMoved={handleMapMoved}
          />

          {showingArea ? (
            <View style={[styles.areaBanner, { top: insets.top + 12 }]}>
              <Text style={styles.areaBannerText}>
                {areaEvents!.length > 0
                  ? `${areaEvents!.length} eventos cerca de aquí`
                  : 'Sin eventos cerca de aquí'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAreaEvents(null);
                  setSearchPoint(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.areaBannerClose}>Volver a {city} ✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {searchPoint ? (
            <TouchableOpacity
              style={[styles.searchAreaButton, { bottom: insets.bottom + 84 }]}
              onPress={handleSearchArea}
              activeOpacity={0.8}
              disabled={searchingArea}
            >
              {searchingArea ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={16} color="#FFFFFF" />
                  <Text style={styles.searchAreaText}>Buscar en esta zona</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.locateButton, { bottom: insets.bottom + 20 }]}
            onPress={handleLocate}
            activeOpacity={0.8}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="locate" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1 },
  locateButton: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  searchAreaButton: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.chip,
    ...cardShadow,
  },
  searchAreaText: { fontFamily: fonts.heading, fontSize: 13, color: '#FFFFFF' },
  areaBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.chip,
    ...cardShadow,
  },
  areaBannerText: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  areaBannerClose: { fontFamily: fonts.body, fontSize: 12, color: colors.primary },
});
