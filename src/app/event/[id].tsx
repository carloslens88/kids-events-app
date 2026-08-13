import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

import { cardShadow, colors, fonts, radius } from '@/constants/theme';
import { useFavorites } from '@/lib/favorites';
import { addToCalendar, shareEvent } from '@/lib/share';
import { supabase } from '@/lib/supabase';
import {
  formatAges,
  formatDuration,
  formatPrice,
  formatScheduleLines,
  getCategory,
  KidsEvent,
} from '@/lib/types';

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
  const duration = formatDuration(event.duration_minutes);

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
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable style={styles.headerButton} onPress={() => shareEvent(event)} hitSlop={8}>
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </Pressable>
              <Pressable style={styles.headerButton} onPress={() => toggle(event.id)} hitSlop={8}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={21}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.hero} contentFit="cover" transition={250} />
          ) : (
            <View style={[styles.hero, styles.heroFallback, { backgroundColor: category.color + '38' }]}>
              <Text style={styles.heroEmoji}>{category.emoji}</Text>
            </View>
          )}
          <LinearGradient colors={['rgba(20, 12, 5, 0.45)', 'transparent']} style={styles.heroScrimTop} />
        </View>

        <View style={styles.sheet}>
          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: category.color }]}>
              <Text style={styles.pillTextLight}>
                {category.emoji} {category.label}
              </Text>
            </View>
            <View style={[styles.pill, styles.pillSoft]}>
              <Text style={styles.pillTextDark}>👶 {formatAges(event)}</Text>
            </View>
            <View style={[styles.pill, event.price_eur <= 0 ? styles.pillFree : styles.pillSoft]}>
              <Text style={event.price_eur <= 0 ? styles.pillTextLight : styles.pillTextDark}>
                {formatPrice(event.price_eur)}
              </Text>
            </View>
            {duration ? (
              <View style={[styles.pill, styles.pillSoft]}>
                <Text style={styles.pillTextDark}>⏱️ {duration}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.infoCard}>
            {formatScheduleLines(event).map((line, index) => (
              <View style={styles.infoRow} key={index}>
                <Text style={styles.infoIcon}>{index === 0 ? '🗓️' : ''}</Text>
                <Text style={styles.infoText}>{line}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>
                {[event.venue_name, event.address, event.city].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>

          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

          <TouchableOpacity style={styles.mapsButton} onPress={openMaps} activeOpacity={0.85}>
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
            <Text style={styles.mapsButtonText}>Cómo llegar</Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => addToCalendar(event)}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar" size={16} color={colors.secondary} />
              <Text style={styles.secondaryButtonText}>Al calendario</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => shareEvent(event)}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social" size={16} color={colors.secondary} />
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
  content: { paddingBottom: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  hero: { width: '100%', height: 300 },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 84 },
  heroScrimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: -26,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    paddingTop: 22,
    gap: 14,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 6 },
  pillSoft: { backgroundColor: colors.card, ...{ borderWidth: 1.5, borderColor: colors.border } },
  pillFree: { backgroundColor: colors.free },
  pillTextLight: { fontFamily: fonts.heading, fontSize: 13, color: '#FFFFFF' },
  pillTextDark: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  title: { fontFamily: fonts.black, fontSize: 25, color: colors.text, lineHeight: 31 },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    gap: 8,
    ...cardShadow,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 15, width: 22, textAlign: 'center' },
  infoText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.text, lineHeight: 21 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  description: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 24 },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 15,
    marginTop: 4,
    ...cardShadow,
  },
  mapsButtonText: { fontFamily: fonts.heading, color: '#FFFFFF', fontSize: 16 },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.button,
    paddingVertical: 13,
  },
  secondaryButtonText: { fontFamily: fonts.heading, color: colors.secondary, fontSize: 14 },
  sourceLink: {
    fontFamily: fonts.heading,
    color: colors.secondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
});
