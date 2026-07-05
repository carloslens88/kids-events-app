import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { AGE_RANGES, AgeRange, CATEGORIES, CategoryId } from '@/lib/types';

type Props = {
  category: CategoryId | null;
  onCategoryChange: (category: CategoryId | null) => void;
  ageRange: AgeRange | null;
  onAgeRangeChange: (range: AgeRange | null) => void;
};

export function FilterBar({ category, onCategoryChange, ageRange, onAgeRangeChange }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && { backgroundColor: c.color, borderColor: c.color }]}
              onPress={() => onCategoryChange(active ? null : c.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c.emoji} {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {AGE_RANGES.map((r) => {
          const active = ageRange?.id === r.id;
          return (
            <TouchableOpacity
              key={r.id}
              style={[styles.chip, active && styles.ageChipActive]}
              onPress={() => onAgeRangeChange(active ? null : r)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingVertical: 10 },
  row: { gap: 8, paddingHorizontal: 16 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ageChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
});
