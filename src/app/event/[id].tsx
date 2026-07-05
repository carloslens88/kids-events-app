import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/theme';
import { useFavorites } from '@/lib/favorites';
import { addToCalendar, shareEvent } from '@/lib/share';
import { supabase } from '@/lib/supabase';
import { formatAges, formatPrice, formatScheduleLines, getCategory, KidsEvent } from '@/lib/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<KidsEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const { favoriteIds, toggle } = useFavorites();

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setEvent(data as KidsEvent | null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <ActivityIndicator style={styles.center} color={colors.primary} size="large" />;
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No encontramos este evento 😕</Text>
      </View>
    );
  }

  const category = getCategory(event.category);
  const isFavorite = favoriteIds.includes(event.id);

  const openMaps = () => {
    const label = encodeURIComponent(event.venue_name ?? event.title);
    const url =
      event.lat != null && event.lng != null
        ? Platform.select({
            ios: `maps:0,0?q=${label}@${event.lat},${event.lng}`,
            default: `geo:0,0?q=${event.lat},${event.lng}(${label})`,
          })
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${event.address ?? ''} ${event.city}`
          )}`;
    Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable onPress={() => shareEvent(event)} hitSlop={12}>
                <Ionicons name="share-outline" size={24} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => toggle(event.id)} hitSlop={12}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={26}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback, { backgroundColor: category.color + '33' }]}>
            <Text style={styles.imageEmoji}>{category.emoji}</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={[styles.categoryBadge, { backgroundColor: category.color + '22' }]}>
            <Text style={[styles.categoryText, { color: category.color }]}>
              {category.emoji} {category.label}
            </Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>

          {formatScheduleLines(event).map((line, index) => (
            <View style={styles.infoRow} key={index}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textMuted}
                style={index > 0 ? styles.invisibleIcon : undefined}
              />
              <Text style={styles.infoText}>{line}</Text>
            </View>
          ))}
          <View style={styles.infoRow}>
            <Ionicons name="happy-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>{formatAges(event)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.infoText, event.price_eur <= 0 && { color: colors.free }]}>
              {formatPrice(event.price_eur)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {[event.venue_name, event.address, event.city].filter(Boolean).join(' · ')}
            </Text>
          </View>

          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

          <TouchableOpacity style={styles.mapsButton} onPress={openMaps}>
            <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
            <Text style={styles.mapsButtonText}>Cómo llegar</Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => addToCalendar(event)}>
              <Ionicons name="calendar-outline" size={17} color={colors.secondary} />
              <Text style={styles.secondaryButtonText}>Al calendario</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => shareEvent(event)}>
              <Ionicons name="share-social-outline" size={17} color={colors.secondary} />
              <Text style={styles.secondaryButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          {event.source_url ? (
            <TouchableOpacity onPress={() => Linking.openURL(event.source_url!)}>
              <Text style={styles.sourceLink}>Más información y entradas ↗</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 220 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 64 },
  body: { padding: 20, gap: 10 },
  categoryBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  categoryText: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 15, color: colors.text, flex: 1 },
  description: { fontSize: 15, color: colors.text, lineHeight: 23, marginTop: 8 },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  mapsButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  invisibleIcon: { opacity: 0 },
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: colors.secondary, fontSize: 14, fontWeight: '700' },
  sourceLink: { color: colors.secondary, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
});
