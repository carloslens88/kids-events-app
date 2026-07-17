import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { cardShadow, colors, radius } from '@/constants/theme';

// Esqueleto de tarjeta con pulso suave mientras cargan los eventos:
// transmite "app viva" mucho mejor que un spinner solitario.
export function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.image, { opacity: pulse }]} />
      <View style={styles.body}>
        <Animated.View style={[styles.line, styles.lineTitle, { opacity: pulse }]} />
        <Animated.View style={[styles.line, styles.lineMid, { opacity: pulse }]} />
        <Animated.View style={[styles.line, styles.lineShort, { opacity: pulse }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginHorizontal: 16,
    marginBottom: 18,
    overflow: 'hidden',
    ...cardShadow,
  },
  image: { width: '100%', height: 160, backgroundColor: colors.border },
  body: { padding: 16, gap: 10 },
  line: { height: 14, borderRadius: 7, backgroundColor: colors.border },
  lineTitle: { width: '75%', height: 18 },
  lineMid: { width: '55%' },
  lineShort: { width: '40%' },
});
