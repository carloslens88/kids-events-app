import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { CityPicker } from '@/components/city-picker';
import { EventCard } from '@/components/event-card';
import { EventsMap } from '@/components/events-map';
import { FilterBar, QuickFilter } from '@/components/filter-bar';
import { KidsOnboarding } from '@/components/kids-onboarding';
import { SetupNotice } from '@/components/setup-notice';
import { colors } from '@/constants/theme';
import { useCity } from '@/lib/city';
import { useUserLocation } from '@/lib/geo';
import { matchesKids, profileBands, useKidsProfile } from '@/lib/kids';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  AgeRange,
  CategoryId,
  KidsEvent,
  nextOccurrence,
  occursBetween,
  todayRange,
  weekendRange,
} from '@/lib/types';
import { rainWarning, useRainForecast } from '@/lib/weather';

// Búsqueda sin distinguir mayúsculas ni acentos ("musica" encuentra "Música").
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

export default function EventsScreen() {
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [kidsFilterOn, setKidsFilterOn] = useState(true);
  const { city, setCity, cities } = useCity();
  const { profile, loaded: profileLoaded, save: saveProfile } = useKidsProfile();
  const userCoords = useUserLocation();

  const fetchEvents = useCallback(async () => {
    setError(null);
    // last_date >= ahora: eventos de un día futuros, fechas múltiples con
    // sesiones pendientes y temporadas abiertas. RLS ya oculta los borradores.
    // status explícito: aunque el admin tenga sesión iniciada, el catálogo
    // muestra exactamente lo que ve el público (los borradores, solo en /admin).
    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .eq('city', city)
      .gte('last_date', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(200);

    if (category) query = query.eq('category', category);
    // Un evento encaja si su rango de edad se solapa con el filtro elegido.
    if (ageRange) query = query.lte('age_min', ageRange.max).gte('age_max', ageRange.min);

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
    } else {
      setEvents((data as KidsEvent[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [category, ageRange, city]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    fetchEvents();
  }, [fetchEvents]);

  // Pronóstico de lluvia para la ciudad (coordenadas del primer evento con lat/lng).
  const cityCoords = useMemo(() => {
    const located = events.find((e) => e.lat != null && e.lng != null);
    return located ? { lat: located.lat!, lng: located.lng! } : null;
  }, [events]);
  const rain = useRainForecast(cityCoords);

  const kidsBands = profileBands(profile);

  const visibleEvents = useMemo(() => {
    const now = new Date();
    const query = normalize(search.trim());
    const dateWindow =
      quickFilter === 'today' ? todayRange(now) : quickFilter === 'weekend' ? weekendRange(now) : null;

    return events
      .filter((event) => {
        if (freeOnly && event.price_eur > 0) return false;
        if (dateWindow && !occursBetween(event, dateWindow[0], dateWindow[1])) return false;
        if (kidsFilterOn && kidsBands.length > 0 && !matchesKids(event, kidsBands)) return false;
        if (query) {
          const haystack = normalize(
            [event.title, event.venue_name, event.description].filter(Boolean).join(' ')
          );
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return nextOccurrence(a, now).getTime() - nextOccurrence(b, now).getTime();
      });
  }, [events, search, quickFilter, freeOnly, kidsFilterOn, kidsBands]);

  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <View style={styles.container}>
      <KidsOnboarding
        visible={profileLoaded && profile === null}
        onDone={(newProfile) => saveProfile(newProfile)}
      />

      <View style={styles.cityRow}>
        <CityPicker city={city} cities={cities} onSelect={setCity} />
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
        {Platform.OS !== 'web' ? (
          <TouchableOpacity
            style={styles.mapToggle}
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            hitSlop={8}
          >
            <Ionicons
              name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <FilterBar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        freeOnly={freeOnly}
        onFreeOnlyChange={setFreeOnly}
        category={category}
        onCategoryChange={setCategory}
        ageRange={ageRange}
        onAgeRangeChange={setAgeRange}
        kidsChip={
          kidsBands.length > 0
            ? {
                label: `Para mis peques${kidsFilterOn ? ' ✓' : ''}`,
                active: kidsFilterOn,
                onToggle: () => setKidsFilterOn(!kidsFilterOn),
              }
            : null
        }
      />

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyTitle}>No se pudieron cargar los eventos</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : viewMode === 'map' && Platform.OS !== 'web' ? (
        <EventsMap events={visibleEvents} />
      ) : (
        <FlatList
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} userCoords={userCoords} rainWarning={rainWarning(item, rain)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEvents();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🎈</Text>
              <Text style={styles.emptyTitle}>No hay eventos con estos filtros</Text>
              <Text style={styles.emptyText}>Prueba a quitar algún filtro o vuelve más tarde.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cityRow: { paddingTop: 10, flexDirection: 'row', alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 36,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  mapToggle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  list: { paddingTop: 4, paddingBottom: 24, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
