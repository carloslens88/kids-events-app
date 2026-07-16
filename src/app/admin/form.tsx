import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/theme';
import { geocodeAddress, uploadEventImage } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, CategoryId, DateMode, KidsEvent } from '@/lib/types';

const DATE_MODES: { id: DateMode; label: string; hint: string }[] = [
  { id: 'single', label: '📅 Un día', hint: 'El evento ocurre una sola vez' },
  { id: 'multiple', label: '🗓️ Varias fechas', hint: 'Sesiones sueltas, ej. 7, 9 y 12 de julio' },
  { id: 'range', label: '📆 Temporada', hint: 'Abierto de forma continua entre dos fechas' },
];

type FormState = {
  title: string;
  description: string;
  category: CategoryId;
  age_min: string;
  age_max: string;
  venue_name: string;
  address: string;
  city: string;
  lat: string;
  lng: string;
  price_eur: string;
  source_url: string;
  image_url: string;
};

const EMPTY: FormState = {
  title: '',
  description: '',
  category: 'taller',
  age_min: '0',
  age_max: '12',
  venue_name: '',
  address: '',
  city: 'Madrid',
  lat: '',
  lng: '',
  price_eur: '0',
  source_url: '',
  image_url: '',
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [dates, setDates] = useState<string[]>(['']); // "AAAA-MM-DD HH:mm", una por sesión
  const [rangeStart, setRangeStart] = useState(''); // "AAAA-MM-DD"
  const [rangeEnd, setRangeEnd] = useState('');
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [featured, setFeatured] = useState(false);
  const [source, setSource] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!id) return;
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const event = data as KidsEvent;
        setStatus(event.status);
        setFeatured(event.featured);
        setSource(event.source);
        setDateMode(event.date_mode);
        if (event.date_mode === 'range') {
          setRangeStart(toLocalInput(event.starts_at).slice(0, 10));
          setRangeEnd(toLocalInput(event.ends_at ?? event.starts_at).slice(0, 10));
        } else {
          setDates([event.starts_at, ...(event.extra_dates ?? [])].map(toLocalInput));
        }
        setForm({
          title: event.title,
          description: event.description ?? '',
          category: event.category,
          age_min: String(event.age_min),
          age_max: String(event.age_max),
          venue_name: event.venue_name ?? '',
          address: event.address ?? '',
          city: event.city,
          lat: event.lat != null ? String(event.lat) : '',
          lng: event.lng != null ? String(event.lng) : '',
          price_eur: String(event.price_eur),
          source_url: event.source_url ?? '',
          image_url: event.image_url ?? '',
        });
      });
  }, [id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      base64: Platform.OS !== 'web',
    });
    if (!result.canceled) setPickedImage(result.assets[0]);
  };

  const findCoordinates = async () => {
    if (!form.address) {
      setError('Escribe primero la dirección');
      return;
    }
    setGeocoding(true);
    setError(null);
    try {
      const coords = await geocodeAddress(form.address, form.city);
      if (coords) {
        setForm((current) => ({ ...current, lat: String(coords.lat), lng: String(coords.lng) }));
      } else {
        setError('No se encontró esa dirección; puedes poner lat/lng a mano');
      }
    } catch {
      setError('Error buscando coordenadas; inténtalo de nuevo');
    }
    setGeocoding(false);
  };

  // Construye starts_at / ends_at / extra_dates según el modo de fechas.
  const buildSchedule = ():
    | { starts_at: string; ends_at: string | null; extra_dates: string[] }
    | string => {
    if (dateMode === 'range') {
      const start = new Date(`${rangeStart.trim()}T00:00`);
      const end = new Date(`${rangeEnd.trim()}T23:59`);
      if (isNaN(start.getTime()) || isNaN(end.getTime()))
        return 'Fechas de la temporada inválidas: usa el formato AAAA-MM-DD';
      if (end < start) return 'La fecha de fin es anterior a la de inicio';
      return { starts_at: start.toISOString(), ends_at: end.toISOString(), extra_dates: [] };
    }
    const filled = (dateMode === 'single' ? dates.slice(0, 1) : dates).filter((d) => d.trim());
    if (filled.length === 0) return 'Añade al menos una fecha';
    const parsed = filled.map((d) => new Date(d.trim().replace(' ', 'T')));
    if (parsed.some((d) => isNaN(d.getTime())))
      return 'Fecha inválida: usa el formato AAAA-MM-DD HH:mm, ej. 2026-07-20 11:00';
    parsed.sort((a, b) => a.getTime() - b.getTime());
    return {
      starts_at: parsed[0].toISOString(),
      ends_at: null,
      extra_dates: parsed.slice(1).map((d) => d.toISOString()),
    };
  };

  const save = async () => {
    setError(null);
    if (!form.title.trim()) return setError('El título es obligatorio');
    const schedule = buildSchedule();
    if (typeof schedule === 'string') return setError(schedule);

    setSaving(true);
    try {
      let imageUrl = form.image_url || null;
      if (pickedImage) imageUrl = await uploadEventImage(pickedImage);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        age_min: parseInt(form.age_min, 10) || 0,
        age_max: parseInt(form.age_max, 10) || 12,
        date_mode: dateMode,
        ...schedule,
        status,
        featured,
        venue_name: form.venue_name.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || 'Madrid',
        lat: form.lat ? parseFloat(form.lat.replace(',', '.')) : null,
        lng: form.lng ? parseFloat(form.lng.replace(',', '.')) : null,
        price_eur: parseFloat(form.price_eur.replace(',', '.')) || 0,
        source_url: form.source_url.trim() || null,
        image_url: imageUrl,
      };

      const { error: saveError } = id
        ? await supabase.from('events').update(payload).eq('id', id)
        : await supabase.from('events').insert(payload);
      if (saveError) throw saveError;
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    }
    setSaving(false);
  };

  const previewUri = pickedImage?.uri ?? (form.image_url || null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Field label="Título *">
        <TextInput style={styles.input} value={form.title} onChangeText={set('title')} />
      </Field>

      <Field label="Descripción">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.description}
          onChangeText={set('description')}
          multiline
        />
      </Field>

      <Field label="Categoría">
        <View style={styles.chips}>
          {CATEGORIES.map((c) => {
            const active = form.category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && { backgroundColor: c.color, borderColor: c.color }]}
                onPress={() => set('category')(c.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.emoji} {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Field>

      <View style={styles.rowFields}>
        <Field label="Edad mínima" style={styles.half}>
          <TextInput
            style={styles.input}
            value={form.age_min}
            onChangeText={set('age_min')}
            keyboardType="number-pad"
          />
        </Field>
        <Field label="Edad máxima" style={styles.half}>
          <TextInput
            style={styles.input}
            value={form.age_max}
            onChangeText={set('age_max')}
            keyboardType="number-pad"
          />
        </Field>
      </View>

      <Field label="Fechas *">
        <View style={styles.chips}>
          {DATE_MODES.map((mode) => {
            const active = dateMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.chip, active && styles.modeChipActive]}
                onPress={() => setDateMode(mode.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{mode.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>{DATE_MODES.find((m) => m.id === dateMode)?.hint}</Text>

        {dateMode === 'range' ? (
          <View style={styles.rowFields}>
            <View style={styles.half}>
              <Text style={styles.label}>Desde (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={rangeStart}
                onChangeText={setRangeStart}
                placeholder="2026-02-01"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Hasta (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={rangeEnd}
                onChangeText={setRangeEnd}
                placeholder="2026-10-12"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        ) : (
          <>
            {(dateMode === 'single' ? dates.slice(0, 1) : dates).map((value, index) => (
              <View key={index} style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  value={value}
                  onChangeText={(text) =>
                    setDates((current) => current.map((d, i) => (i === index ? text : d)))
                  }
                  placeholder="2026-07-20 11:00"
                  placeholderTextColor={colors.textMuted}
                />
                {dateMode === 'multiple' && dates.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => setDates((current) => current.filter((_, i) => i !== index))}
                    hitSlop={10}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {dateMode === 'multiple' ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setDates((current) => [...current, ''])}
              >
                <Text style={styles.secondaryButtonText}>＋ Añadir otra fecha</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </Field>

      <Field label="Lugar (nombre)">
        <TextInput style={styles.input} value={form.venue_name} onChangeText={set('venue_name')} />
      </Field>

      <Field label="Dirección">
        <TextInput style={styles.input} value={form.address} onChangeText={set('address')} />
      </Field>

      <Field label="Ciudad">
        <TextInput style={styles.input} value={form.city} onChangeText={set('city')} />
      </Field>

      <View style={styles.rowFields}>
        <Field label="Latitud" style={styles.half}>
          <TextInput style={styles.input} value={form.lat} onChangeText={set('lat')} />
        </Field>
        <Field label="Longitud" style={styles.half}>
          <TextInput style={styles.input} value={form.lng} onChangeText={set('lng')} />
        </Field>
      </View>
      <TouchableOpacity style={styles.secondaryButton} onPress={findCoordinates} disabled={geocoding}>
        <Text style={styles.secondaryButtonText}>
          {geocoding ? 'Buscando…' : '📍 Obtener coordenadas de la dirección'}
        </Text>
      </TouchableOpacity>

      <Field label="Precio en € (0 = gratis)">
        <TextInput
          style={styles.input}
          value={form.price_eur}
          onChangeText={set('price_eur')}
          keyboardType="decimal-pad"
        />
      </Field>

      <Field label="Web del evento / entradas">
        <TextInput
          style={styles.input}
          value={form.source_url}
          onChangeText={set('source_url')}
          autoCapitalize="none"
          placeholder="https://…"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="Foto">
        {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" /> : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
          <Text style={styles.secondaryButtonText}>
            {previewUri ? '🖼️ Cambiar foto' : '🖼️ Elegir foto'}
          </Text>
        </TouchableOpacity>
      </Field>

      <Field label="Publicación">
        {source !== 'manual' ? (
          <Text style={styles.hint}>
            Importado de {source === 'madrid_opendata' ? 'datos.madrid.es' : source}. Revisa y
            enriquece antes de publicar.
          </Text>
        ) : null}
        <View style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, status === 'draft' && styles.draftChipActive]}
            onPress={() => setStatus('draft')}
          >
            <Text style={[styles.chipText, status === 'draft' && styles.chipTextActive]}>
              📝 Borrador
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, status === 'published' && styles.publishedChipActive]}
            onPress={() => setStatus('published')}
          >
            <Text style={[styles.chipText, status === 'published' && styles.chipTextActive]}>
              ✅ Publicado
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, featured && styles.featuredChipActive]}
            onPress={() => setFeatured(!featured)}
          >
            <Text style={[styles.chipText, featured && styles.chipTextActive]}>⭐ Destacado</Text>
          </TouchableOpacity>
        </View>
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>{id ? 'Guardar cambios' : 'Crear evento'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
  rowFields: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, gap: 6 },
  modeChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  draftChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  publishedChipActive: { backgroundColor: colors.free, borderColor: colors.free },
  featuredChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  hint: { fontSize: 12, color: colors.textMuted },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.secondary, fontSize: 14, fontWeight: '700' },
  preview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
  error: { color: colors.primary, fontSize: 14, textAlign: 'center' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
