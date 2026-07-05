import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  city: string;
  cities: string[];
  onSelect: (city: string) => void;
};

export function CityPicker({ city, cities, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)}>
        <Ionicons name="location-sharp" size={15} color={colors.primary} />
        <Text style={styles.buttonText}>{city}</Text>
        <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
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
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{c}</Text>
                  {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
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
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 49, 66, 0.45)',
    justifyContent: 'center',
    padding: 32,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionActive: { backgroundColor: colors.primary + '15' },
  optionText: { fontSize: 16, color: colors.text },
  optionTextActive: { fontWeight: '700', color: colors.primary },
});
