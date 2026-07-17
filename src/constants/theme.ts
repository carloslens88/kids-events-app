import { Platform } from 'react-native';

// Sistema de diseño "Peque-Eventos": cálido, redondeado y con carácter.
export const colors = {
  background: '#FCFBFA',
  card: '#FFFFFF',
  text: '#2B2733',
  textMuted: '#918D9B',
  primary: '#FF6B6B',
  primarySoft: '#FFE9E4',
  secondary: '#0FAEA2',
  secondarySoft: '#E0F5F3',
  accent: '#FFC94D',
  accentSoft: '#FFF3D6',
  border: '#EFECE8',
  free: '#10B981',
  freeSoft: '#DDF5EC',
};

// Nunito: redondeada y amable, marca la personalidad de toda la app.
export const fonts = {
  black: 'Nunito_900Black',
  heading: 'Nunito_800ExtraBold',
  bold: 'Nunito_700Bold',
  body: 'Nunito_600SemiBold',
};

export const radius = {
  card: 22,
  chip: 999,
  button: 16,
  sheet: 28,
};

// Sombra suave y consistente para tarjetas y botones flotantes.
export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#8C6B4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  android: { elevation: 3 },
  default: {
    // web
    boxShadow: '0 6px 18px rgba(140, 107, 79, 0.12)',
  },
}) as object;

export const softShadow = Platform.select({
  ios: {
    shadowColor: '#8C6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: { elevation: 1 },
  default: {
    boxShadow: '0 2px 8px rgba(140, 107, 79, 0.08)',
  },
}) as object;
