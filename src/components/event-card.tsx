import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, colors, fonts, radius } from '@/constants/theme';
import { Coords, distanceKm, formatDistance } from '@/lib/geo';
import {
  formatAges,
  formatPrice,
  formatSchedule,
  getCategory,
  KidsEvent,
  nextOccurrence,
} from '@/lib/types';

type Props = {
  event: KidsEvent;
  userCoords: Coords | null;
  rainWarning?: string | null;
};

export function EventCard({ event, userCoords, rainWarning }: Props) {
  const category = getCategory(event.category);
  const rawDistance =
    userCoords && event.lat != null && event.lng != null
      ? distanceKm(userCoords, { latitude: event.lat, longitude: event.lng })
      : null;
  // Si el usuario está lejos de la ciudad (viendo la agenda de otra ciudad),
  // la distancia no aporta nada: mejor ocultarla.
  const distance = rawDistance != null && rawDistance <= 100 ? rawDistance : null;

  const next = nextOccurrence(event);
  const dateDay = next.getDate();
  const dateMonth = next
    .toLocaleDateString('es-ES', { month: 'short' })
    .replace('.', '');

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.imageWrap}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.image} contentFit="cover" transition={250} />
          ) : (
            <View style={[styles.image, styles.imageFallback, { backgroundColor: category.color + '2E' }]}>
              <Text style={styles.imageEmoji}>{category.emoji}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(30, 20, 10, 0.45)']}
            style={styles.imageScrim}
          />

          {/* Chip de fecha tipo calendario */}
          <View style={styles.dateChip}>
            <Text style={styles.dateDay}>{dateDay}</Text>
            <Text style={styles.dateMonth}>{dateMonth}</Text>
          </View>

          {event.featured ? (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>⭐ Top</Text>
            </View>
          ) : null}

          <View style={[styles.pricePill, event.price_eur <= 0 && styles.pricePillFree]}>
            <Text style={styles.priceText}>{formatPrice(event.price_eur)}</Text>
          </View>

          <View style={[styles.categoryPill, { backgroundColor: category.color }]}>
            <Text style={styles.categoryPillText}>
              {category.emoji} {category.label}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.schedule}>🗓️ {formatSchedule(event)}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            📍 {event.venue_name ?? event.address ?? event.city}
            {distance != null ? `  ·  a ${formatDistance(distance)}` : ''}
          </Text>
          <View style={styles.footRow}>
            <View style={styles.agePill}>
              <Text style={styles.agePillText}>👶 {formatAges(event)}</Text>
            </View>
            {rainWarning ? <Text style={styles.rain}>{rainWarning}</Text> : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginHorizontal: 16,
    marginBottom: 18,
    overflow: 'hidden',
    ...cardShadow,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 160 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 56 },
  imageScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 },
  dateChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 46,
  },
  dateDay: { fontFamily: fonts.black, fontSize: 18, color: colors.primary, lineHeight: 20 },
  dateMonth: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 66,
    backgroundColor: colors.accent,
    borderRadius: radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredText: { fontFamily: fonts.heading, fontSize: 12, color: '#5C4300' },
  pricePill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(43, 39, 51, 0.75)',
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pricePillFree: { backgroundColor: colors.free },
  priceText: { fontFamily: fonts.heading, fontSize: 13, color: '#FFFFFF' },
  categoryPill: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    borderRadius: radius.chip,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  categoryPillText: { fontFamily: fonts.heading, fontSize: 12, color: '#FFFFFF' },
  body: { padding: 16, paddingTop: 13, gap: 4 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, lineHeight: 23 },
  schedule: { fontFamily: fonts.body, fontSize: 13.5, color: colors.secondary, marginTop: 2 },
  meta: { fontFamily: fonts.body, fontSize: 13.5, color: colors.textMuted },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  agePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  agePillText: { fontFamily: fonts.heading, fontSize: 12, color: colors.primary },
  rain: { fontFamily: fonts.heading, fontSize: 12.5, color: '#2563EB' },
});
