import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventsMap } from '@/components/events-map';
import { SetupNotice } from '@/components/setup-notice';
import { cardShadow, colors } from '@/constants/theme';
import { useCity } from '@/lib/city';
import { useUserLocation } from '@/lib/geo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { KidsEvent } from '@/lib/types';

export default function MapScreen() {
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [centerRequestId, setCenterRequestId] = useState(0);
  const { city } = useCity();
  const userCoords = useUserLocation();
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
          setEvents((data as KidsEvent[]) ?? []);
          setLoading(false);
        });
    }, [city])
  );

  if (!isSupabaseConfigured) return <SetupNotice />;

  const userLocation = userCoords ? { lat: userCoords.latitude, lng: userCoords.longitude } : null;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      ) : (
        <>
          <EventsMap
            events={events}
            city={city}
            userLocation={userLocation}
            centerRequestId={centerRequestId}
          />
          {userLocation ? (
            <TouchableOpacity
              style={[styles.locateButton, { bottom: insets.bottom + 20 }]}
              onPress={() => setCenterRequestId((n) => n + 1)}
              activeOpacity={0.8}
            >
              <Ionicons name="locate" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
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
});
