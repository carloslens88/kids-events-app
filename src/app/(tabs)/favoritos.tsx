import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { SetupNotice } from '@/components/setup-notice';
import { colors } from '@/constants/theme';
import { useFavorites } from '@/lib/favorites';
import { useUserLocation } from '@/lib/geo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { KidsEvent } from '@/lib/types';

export default function FavoritesScreen() {
  const { favoriteIds } = useFavorites();
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const userCoords = useUserLocation();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (favoriteIds.length === 0) {
      setEvents([]);
      return;
    }
    setLoading(true);
    supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .in('id', favoriteIds)
      .order('starts_at', { ascending: true })
      .then(({ data }) => {
        setEvents((data as KidsEvent[]) ?? []);
        setLoading(false);
      });
  }, [favoriteIds]);

  if (!isSupabaseConfigured) return <SetupNotice />;

  if (loading && events.length === 0) {
    return <ActivityIndicator style={styles.center} color={colors.primary} size="large" />;
  }

  return (
    <FlatList
      style={styles.container}
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EventCard event={item} userCoords={userCoords} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💛</Text>
          <Text style={styles.emptyTitle}>Aún no tienes favoritos</Text>
          <Text style={styles.emptyText}>
            Toca el corazón en cualquier evento para guardarlo aquí.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingTop: 12, paddingBottom: 24, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
