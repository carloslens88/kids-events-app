import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EventsMap } from '@/components/events-map';
import { SetupNotice } from '@/components/setup-notice';
import { colors } from '@/constants/theme';
import { useCity } from '@/lib/city';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { KidsEvent } from '@/lib/types';

export default function MapScreen() {
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { city } = useCity();

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
          setEvents((data as KidsEvent[]) ?? []);
          setLoading(false);
        });
    }, [city])
  );

  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      ) : (
        <EventsMap events={events} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1 },
});
