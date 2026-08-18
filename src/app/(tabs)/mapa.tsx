import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventsMap } from '@/components/events-map';
import { SetupNotice } from '@/components/setup-notice';
import { cardShadow, colors } from '@/constants/theme';
import { useCity } from '@/lib/city';
import { requestUserLocation } from '@/lib/geo';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { KidsEvent } from '@/lib/types';

export default function MapScreen() {
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [centerOn, setCenterOn] = useState<{ lat: number; lng: number } | null>(null);
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
          setEvents((data as KidsEvent[]) ?? []);
          setLoading(false);
        });
    }, [city])
  );

  const handleLocate = async () => {
    setLocating(true);
    const coords = await requestUserLocation();
    setLocating(false);
    if (!coords) {
      Alert.alert(
        'Sin acceso a tu ubicación',
        'Activa el permiso de ubicación para esta app en los ajustes de tu dispositivo.'
      );
      return;
    }
    setCenterOn({ lat: coords.latitude, lng: coords.longitude });
  };

  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      ) : (
        <>
          <EventsMap events={events} city={city} centerOn={centerOn} />
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
});
