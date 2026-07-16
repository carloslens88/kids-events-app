import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { AGE_RANGES, AgeRange, CATEGORIES, CategoryId } from '@/lib/types';

export type QuickFilter = 'today' | 'weekend' | null;

type Props = {
  quickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  freeOnly: boolean;
  onFreeOnlyChange: (free: boolean) => void;
  category: CategoryId | null;
  onCategoryChange: (category: CategoryId | null) => void;
  ageRange: AgeRange | null;
  onAgeRangeChange: (range: AgeRange | null) => void;
  kidsChip?: { label: string; active: boolean; onToggle: () => void } | null;
};

export function FilterBar({
  quickFilter,
  onQuickFilterChange,
  freeOnly,
  onFreeOnlyChange,
  category,
  onCategoryChange,
  ageRange,
  onAgeRangeChange,
  kidsChip,
}: Props) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {kidsChip ? (
          <TouchableOpacity
            style={[styles.chip, styles.quickChip, kidsChip.active && styles.kidsChipActive]}
            onPress={kidsChip.onToggle}
          >
            <Text style={[styles.chipText, kidsChip.active && styles.chipTextActive]}>
              👶 {kidsChip.label}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.chip, styles.quickChip, quickFilter === 'today' && styles.quickChipActive]}
          onPress={() => onQuickFilterChange(quickFilter === 'today' ? null : 'today')}
        >
          <Text style={[styles.chipText, quickFilter === 'today' && styles.chipTextActive]}>
            ☀️ Hoy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, styles.quickChip, quickFilter === 'weekend' && styles.quickChipActive]}
          onPress={() => onQuickFilterChange(quickFilter === 'weekend' ? null : 'weekend')}
        >
          <Text style={[styles.chipText, quickFilter === 'weekend' && styles.chipTextActive]}>
            🎉 Este finde
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, styles.quickChip, freeOnly && styles.freeChipActive]}
          onPress={() => onFreeOnlyChange(!freeOnly)}
        >
          <Text style={[styles.chipText, freeOnly && styles.chipTextActive]}>🆓 Gratis</Text>
        </TouchableOpacity>
      </ScrollView>

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
  quickChip: { borderColor: colors.primary + '55' },
  quickChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  freeChipActive: { backgroundColor: colors.free, borderColor: colors.free },
  kidsChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  ageChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
});
