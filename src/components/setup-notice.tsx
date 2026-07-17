import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

// Se muestra cuando falta el archivo .env con las credenciales de Supabase,
// para que el primer arranque explique qué hay que configurar.
export function SetupNotice() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔧</Text>
      <Text style={styles.title}>Falta conectar Supabase</Text>
      <Text style={styles.text}>
        Copia .env.example a .env, rellena EXPO_PUBLIC_SUPABASE_URL y
        EXPO_PUBLIC_SUPABASE_ANON_KEY con los datos de tu proyecto de Supabase y reinicia la app
        con `npx expo start -c`.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emoji: { fontSize: 40 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});
