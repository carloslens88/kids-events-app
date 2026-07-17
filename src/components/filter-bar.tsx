import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, radius, softShadow } from '@/constants/theme';
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
      {/* Filtros rápidos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {kidsChip ? (
          <Chip
            label={`👶 ${kidsChip.label}`}
            active={kidsChip.active}
            activeColor={colors.accent}
            activeTextColor="#5C4300"
            onPress={kidsChip.onToggle}
          />
        ) : null}
        <Chip
          label="☀️ Hoy"
          active={quickFilter === 'today'}
          activeColor={colors.primary}
          onPress={() => onQuickFilterChange(quickFilter === 'today' ? null : 'today')}
        />
        <Chip
          label="🎉 Este finde"
          active={quickFilter === 'weekend'}
          activeColor={colors.primary}
          onPress={() => onQuickFilterChange(quickFilter === 'weekend' ? null : 'weekend')}
        />
        <Chip
          label="🆓 Gratis"
          active={freeOnly}
          activeColor={colors.free}
          onPress={() => onFreeOnlyChange(!freeOnly)}
        />
        {AGE_RANGES.map((r) => (
          <Chip
            key={r.id}
            label={r.label}
            active={ageRange?.id === r.id}
            activeColor={colors.secondary}
            onPress={() => onAgeRangeChange(ageRange?.id === r.id ? null : r)}
          />
        ))}
      </ScrollView>

      {/* Categorías: fichas circulares de emoji */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.categoryTile}
              onPress={() => onCategoryChange(active ? null : c.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.categoryCircle,
                  { backgroundColor: active ? c.color : c.color + '24' },
                  active && styles.categoryCircleActive,
                ]}
              >
                <Text style={styles.categoryEmoji}>{c.emoji}</Text>
              </View>
              <Text style={[styles.categoryLabel, active && { color: c.color }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  activeColor,
  activeTextColor = '#FFFFFF',
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  activeTextColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: activeColor, borderColor: activeColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && { color: activeTextColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingVertical: 12 },
  row: { gap: 8, paddingHorizontal: 16, alignItems: 'flex-start' },
  chip: {
    borderRadius: radius.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...softShadow,
  },
  chipText: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  categoryTile: { alignItems: 'center', width: 66 },
  categoryCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCircleActive: { transform: [{ scale: 1.06 }], ...softShadow },
  categoryEmoji: { fontSize: 25 },
  categoryLabel: {
    fontFamily: fonts.heading,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 5,
  },
});
