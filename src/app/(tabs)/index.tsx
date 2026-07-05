import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CityPicker } from '@/components/city-picker';
import { EventCard } from '@/components/event-card';
import { FilterBar } from '@/components/filter-bar';
import { SetupNotice } from '@/components/setup-notice';
import { colors } from '@/constants/theme';
import { useCity } from '@/lib/city';
import { useUserLocation } from '@/lib/geo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AgeRange, CategoryId, KidsEvent, nextOccurrence } from '@/lib/types';

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
  const [search, setSearch] = useState('');
  const { city, setCity, cities } = useCity();
  const userCoords = useUserLocation();

  const fetchEvents = useCallback(async () => {
    setError(null);
    // last_date >= ahora: incluye eventos de un día futuros, fechas múltiples
    // con alguna sesión pendiente y temporadas (rangos) aún abiertas.
    let query = supabase
      .from('events')
      .select('*')
      .eq('city', city)
      .gte('last_date', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(100);

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

  const visibleEvents = useMemo(() => {
    const now = new Date();
    const query = normalize(search.trim());
    return events
      .filter((event) => {
        if (!query) return true;
        const haystack = normalize(
          [event.title, event.venue_name, event.description].filter(Boolean).join(' ')
        );
        return haystack.includes(query);
      })
      .sort((a, b) => nextOccurrence(a, now).getTime() - nextOccurrence(b, now).getTime());
  }, [events, search]);

  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <View style={styles.container}>
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
      </View>
      <FilterBar
        category={category}
        onCategoryChange={setCategory}
        ageRange={ageRange}
        onAgeRangeChange={setAgeRange}
      />
      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyTitle}>No se pudieron cargar los eventos</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} userCoords={userCoords} />}
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
    marginRight: 16,
    height: 36,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  list: { paddingTop: 4, paddingBottom: 24, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
