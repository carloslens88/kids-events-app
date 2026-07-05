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

import { colors } from '@/constants/theme';
import { geocodeAddress, uploadEventImage } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, CategoryId, KidsEvent } from '@/lib/types';

type FormState = {
  title: string;
  description: string;
  category: CategoryId;
  age_min: string;
  age_max: string;
  starts_at: string; // "AAAA-MM-DD HH:mm" en hora local
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
  starts_at: '',
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
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
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
        setForm({
          title: event.title,
          description: event.description ?? '',
          category: event.category,
          age_min: String(event.age_min),
          age_max: String(event.age_max),
          starts_at: toLocalInput(event.starts_at),
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

  const save = async () => {
    setError(null);
    if (!form.title.trim()) return setError('El título es obligatorio');
    const startsAt = new Date(form.starts_at.replace(' ', 'T'));
    if (isNaN(startsAt.getTime()))
      return setError('Fecha inválida: usa el formato AAAA-MM-DD HH:mm, ej. 2026-07-20 11:00');

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
        starts_at: startsAt.toISOString(),
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

      <Field label="Fecha y hora * (AAAA-MM-DD HH:mm)">
        <TextInput
          style={styles.input}
          value={form.starts_at}
          onChangeText={set('starts_at')}
          placeholder="2026-07-20 11:00"
          placeholderTextColor={colors.textMuted}
        />
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
  half: { flex: 1 },
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
