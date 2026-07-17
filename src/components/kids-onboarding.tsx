import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { KidsProfile } from '@/lib/kids';
import { enableWeeklyReminder } from '@/lib/notifications';
import { AGE_RANGES } from '@/lib/types';

type Props = {
  visible: boolean;
  onDone: (profile: KidsProfile) => void;
};

// Primera apertura de la app: pregunta las edades de los peques (para
// personalizar el catálogo) y ofrece el recordatorio semanal del finde.
export function KidsOnboarding({ visible, onDone }: Props) {
  const [step, setStep] = useState<'ages' | 'reminder'>('ages');
  const [selected, setSelected] = useState<string[]>([]);

  const toggleBand = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((b) => b !== id) : [...current, id]
    );

  const finish = async (withReminder: boolean) => {
    if (withReminder) await enableWeeklyReminder();
    onDone({ bandIds: selected, asked: true });
  };

  const nextFromAges = () => {
    if (Platform.OS === 'web') {
      // En web no hay notificaciones locales: terminamos aquí.
      onDone({ bandIds: selected, asked: true });
    } else {
      setStep('reminder');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {step === 'ages' ? (
            <>
              <Text style={styles.emoji}>👋</Text>
              <Text style={styles.title}>¡Hola! ¿Qué edades tienen tus peques?</Text>
              <Text style={styles.subtitle}>
                Te enseñaremos primero los planes que encajan con ellos. Se guarda solo en tu
                dispositivo.
              </Text>
              <View style={styles.bands}>
                {AGE_RANGES.map((band) => {
                  const active = selected.includes(band.id);
                  return (
                    <TouchableOpacity
                      key={band.id}
                      style={[styles.band, active && styles.bandActive]}
                      onPress={() => toggleBand(band.id)}
                    >
                      <Text style={[styles.bandText, active && styles.bandTextActive]}>
                        {band.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, selected.length === 0 && styles.buttonDisabled]}
                onPress={nextFromAges}
                disabled={selected.length === 0}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDone({ bandIds: [], asked: true })}>
                <Text style={styles.skip}>Ahora no, ver todo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.emoji}>🔔</Text>
              <Text style={styles.title}>¿Te avisamos cada jueves?</Text>
              <Text style={styles.subtitle}>
                Un recordatorio a la semana con los planes del finde. Sin spam.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => finish(true)}>
                <Text style={styles.primaryButtonText}>Sí, avisadme</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => finish(false)}>
                <Text style={styles.skip}>No, gracias</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 49, 66, 0.5)',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emoji: { fontSize: 40 },
  title: { fontFamily: fonts.black, fontSize: 21, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  bands: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: 8 },
  band: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  bandActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bandText: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  bandTextActive: { color: '#FFFFFF' },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.4 },
  primaryButtonText: { fontFamily: fonts.heading, color: '#FFFFFF', fontSize: 16 },
  skip: { fontFamily: fonts.bold, color: colors.textMuted, fontSize: 14, padding: 6 },
});
