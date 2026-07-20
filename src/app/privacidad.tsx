import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

// Política de privacidad pública, requerida por Google Play y la App Store.
// URL final: https://kids-events-app.expo.app/privacidad
export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacidad' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Política de privacidad</Text>
        <Text style={styles.updated}>Última actualización: julio de 2026</Text>

        <Text style={styles.paragraph}>
          Peque-Eventos es un catálogo de planes infantiles y familiares. Esta página explica,
          en un lenguaje sencillo, qué datos usa la app y por qué.
        </Text>

        <Section title="No creamos cuentas de usuario">
          Peque-Eventos no requiere registro ni inicio de sesión. No recogemos tu nombre, email
          ni ningún dato personal para usar el catálogo.
        </Section>

        <Section title="Ubicación">
          Si das permiso, usamos tu ubicación en primer plano (solo mientras usas la app) para
          calcular a qué distancia está cada plan de ti. Esta ubicación no se envía a ningún
          servidor ni se guarda: se usa únicamente en tu dispositivo, en el momento, para mostrar
          el dato de distancia. Puedes usar la app sin dar este permiso; simplemente no verás la
          distancia a cada evento.
        </Section>

        <Section title="Datos guardados en tu dispositivo">
          Guardamos localmente, solo en tu teléfono (nunca en un servidor):
          {'\n\n'}• Tus eventos favoritos.
          {'\n'}• La ciudad que has elegido.
          {'\n'}• Las edades de tus hijos, si las indicaste en la bienvenida (para personalizar el
          catálogo).
          {'\n\n'}
          Puedes borrar estos datos en cualquier momento desinstalando la app o borrando sus
          datos desde los ajustes del sistema.
        </Section>

        <Section title="Notificaciones">
          Si activas el recordatorio semanal, se programa como una notificación local en tu
          propio dispositivo. No usamos servidores de notificaciones push ni recopilamos ningún
          dato para enviarla.
        </Section>

        <Section title="Terceros que usamos">
          Para mostrar el catálogo y el mapa, la app se conecta a:
          {'\n\n'}• <Text style={styles.bold}>Supabase</Text> (nuestra base de datos de eventos):
          recibe únicamente peticiones de lectura del catálogo, sin datos personales tuyos.
          {'\n'}• <Text style={styles.bold}>OpenStreetMap</Text>, para mostrar el mapa de eventos.
          {'\n'}• <Text style={styles.bold}>Open-Meteo</Text>, para el aviso de previsión de
          lluvia en eventos al aire libre (recibe solo la coordenada de la ciudad, no la tuya).
          {'\n\n'}
          Ninguno de estos servicios recibe datos que te identifiquen.
        </Section>

        <Section title="Publicidad y seguimiento">
          Peque-Eventos no muestra anuncios, no usa cookies de seguimiento ni comparte datos con
          fines publicitarios.
        </Section>

        <Section title="Menores de edad">
          La app está dirigida a personas adultas (madres, padres y tutores) que buscan planes
          para sus hijos. No recopilamos datos de menores: los menores no usan la app
          directamente.
        </Section>

        <Section title="Contacto">
          Si tienes cualquier duda sobre esta política, escríbenos a través del repositorio del
          proyecto: github.com/carloslens88/kids-events-app.
        </Section>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.paragraph}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.text, marginBottom: 4 },
  updated: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginBottom: 18 },
  section: { marginTop: 18 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.text, marginBottom: 6 },
  paragraph: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 23 },
  bold: { fontFamily: fonts.bold },
});
