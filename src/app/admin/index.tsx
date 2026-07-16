import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/theme';
import { confirmAction } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { formatSchedule, getCategory, KidsEvent } from '@/lib/types';

type StatusFilter = 'draft' | 'published' | 'all';

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  madrid_opendata: 'Ayto. Madrid',
  eventbrite: 'Eventbrite',
};

export default function AdminEventList() {
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('draft');
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(() => {
    // El admin ve todo: borradores, publicados y pasados.
    supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true })
      .then(({ data }) => setEvents((data as KidsEvent[]) ?? []));
  }, []);

  useFocusEffect(fetchAll);

  const counts = useMemo(
    () => ({
      draft: events.filter((e) => e.status === 'draft').length,
      published: events.filter((e) => e.status === 'published').length,
    }),
    [events]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (statusFilter !== 'all' && event.status !== statusFilter) return false;
      if (query && !`${event.title} ${event.venue_name ?? ''}`.toLowerCase().includes(query))
        return false;
      return true;
    });
  }, [events, statusFilter, search]);

  const setEventFields = async (id: string, fields: Partial<KidsEvent>) => {
    await supabase.from('events').update(fields).eq('id', id);
    fetchAll();
  };

  const remove = (event: KidsEvent) => {
    confirmAction('Borrar evento', `¿Seguro que quieres borrar "${event.title}"?`, async () => {
      await supabase.from('events').delete().eq('id', event.id);
      fetchAll();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Link href="/admin/form" asChild>
          <TouchableOpacity style={styles.newButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </Link>
        <TextInput
          style={styles.search}
          placeholder="Buscar…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity onPress={() => supabase.auth.signOut()} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        {(
          [
            ['draft', `Borradores (${counts.draft})`],
            ['published', `Publicados (${counts.published})`],
            ['all', 'Todos'],
          ] as [StatusFilter, string][]
        ).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.statusChip, statusFilter === value && styles.statusChipActive]}
            onPress={() => setStatusFilter(value)}
          >
            <Text
              style={[styles.statusChipText, statusFilter === value && styles.statusChipTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const past = new Date(item.last_date ?? item.starts_at) < new Date();
          const isDraft = item.status === 'draft';
          return (
            <View style={[styles.row, past && styles.rowPast]}>
              <Text style={styles.rowEmoji}>{getCategory(item.category).emoji}</Text>
              <Link
                href={{ pathname: '/admin/form', params: { id: item.id } }}
                asChild
                style={styles.rowBody}
              >
                <TouchableOpacity>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatSchedule(item)} · {SOURCE_LABELS[item.source] ?? item.source}
                    {past ? ' · (pasado)' : ''}
                  </Text>
                  <View style={styles.badges}>
                    <View style={[styles.badge, isDraft ? styles.badgeDraft : styles.badgePublished]}>
                      <Text style={styles.badgeText}>{isDraft ? 'BORRADOR' : 'PUBLICADO'}</Text>
                    </View>
                    {item.featured ? (
                      <View style={[styles.badge, styles.badgeFeatured]}>
                        <Text style={styles.badgeText}>⭐ DESTACADO</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </Link>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() =>
                    setEventFields(item.id, { status: isDraft ? 'published' : 'draft' })
                  }
                  hitSlop={8}
                >
                  <Ionicons
                    name={isDraft ? 'cloud-upload-outline' : 'eye-off-outline'}
                    size={21}
                    color={isDraft ? colors.free : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEventFields(item.id, { featured: !item.featured })}
                  hitSlop={8}
                >
                  <Ionicons
                    name={item.featured ? 'star' : 'star-outline'}
                    size={21}
                    color={item.featured ? colors.accent : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {statusFilter === 'draft'
              ? 'No hay borradores pendientes. El importador diario los irá trayendo aquí.'
              : 'Nada por aquí.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  newButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
  },
  statusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  statusChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  statusChipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  rowPast: { opacity: 0.55 },
  rowEmoji: { fontSize: 22 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 5 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeDraft: { backgroundColor: '#FEF3C7' },
  badgePublished: { backgroundColor: '#D1FAE5' },
  badgeFeatured: { backgroundColor: '#FFF7E0' },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.text },
  actions: { gap: 12, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15, paddingHorizontal: 24 },
});
