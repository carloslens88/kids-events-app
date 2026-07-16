import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { Coords, distanceKm, formatDistance } from '@/lib/geo';
import { formatAges, formatPrice, formatSchedule, getCategory, KidsEvent } from '@/lib/types';

type Props = {
  event: KidsEvent;
  userCoords: Coords | null;
  rainWarning?: string | null;
};

export function EventCard({ event, userCoords, rainWarning }: Props) {
  const category = getCategory(event.category);
  const distance =
    userCoords && event.lat != null && event.lng != null
      ? distanceKm(userCoords, { latitude: event.lat, longitude: event.lng })
      : null;

  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback, { backgroundColor: category.color + '33' }]}>
            <Text style={styles.imageEmoji}>{category.emoji}</Text>
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.badgeGroup}>
              {event.featured ? <Text style={styles.featuredStar}>⭐</Text> : null}
              <View style={[styles.categoryBadge, { backgroundColor: category.color + '22' }]}>
                <Text style={[styles.categoryText, { color: category.color }]}>
                  {category.emoji} {category.label}
                </Text>
              </View>
            </View>
            <Text style={[styles.price, event.price_eur <= 0 && styles.priceFree]}>
              {formatPrice(event.price_eur)}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.meta}>{formatSchedule(event)}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            📍 {event.venue_name ?? event.address ?? event.city}
            {distance != null ? `  ·  a ${formatDistance(distance)}` : ''}
          </Text>
          <Text style={styles.ages}>👶 {formatAges(event)}</Text>
          {rainWarning ? <Text style={styles.rain}>{rainWarning}</Text> : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  image: { width: '100%', height: 140 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 48 },
  body: { padding: 14, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredStar: { fontSize: 14 },
  rain: { fontSize: 13, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  categoryBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  price: { fontSize: 14, fontWeight: '700', color: colors.text },
  priceFree: { color: colors.free },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted },
  ages: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
