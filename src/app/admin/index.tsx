import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { confirmAction } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { formatEventDate, getCategory, KidsEvent } from '@/lib/types';

export default function AdminEventList() {
  const [events, setEvents] = useState<KidsEvent[]>([]);

  const fetchAll = useCallback(() => {
    // El admin ve todos los eventos, también los pasados.
    supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: false })
      .then(({ data }) => setEvents((data as KidsEvent[]) ?? []));
  }, []);

  useFocusEffect(fetchAll);

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
            <Text style={styles.newButtonText}>Nuevo evento</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOut}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const past = new Date(item.starts_at) < new Date();
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
                  <Text style={styles.rowMeta}>
                    {formatEventDate(item.starts_at)} · {item.city}
                    {past ? '  (pasado)' : ''}
                  </Text>
                </TouchableOpacity>
              </Link>
              <TouchableOpacity onPress={() => remove(item)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay eventos todavía. Crea el primero.</Text>
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
    justifyContent: 'space-between',
    padding: 16,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  newButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  signOut: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  rowPast: { opacity: 0.55 },
  rowEmoji: { fontSize: 22 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
});
