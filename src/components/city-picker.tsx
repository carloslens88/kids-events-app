import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, radius, softShadow } from '@/constants/theme';

type Props = {
  city: string;
  cities: string[];
  onSelect: (city: string) => void;
};

export function CityPicker({ city, cities, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Ionicons name="location-sharp" size={15} color={colors.primary} />
        <Text style={styles.buttonText}>{city}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>¿En qué ciudad buscas planes?</Text>
            {cities.map((c) => {
              const active = c === city;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onSelect(c);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionEmoji}>📍</Text>
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{c}</Text>
                  {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingHorizontal: 13,
    height: 40,
    ...softShadow,
  },
  buttonText: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43, 39, 51, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 22,
    paddingBottom: 40,
    gap: 6,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 19, color: colors.text, marginBottom: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.button,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionEmoji: { fontSize: 16 },
  optionText: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  optionTextActive: { fontFamily: fonts.heading, color: colors.primary },
});
