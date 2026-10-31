// ═══════════════════════════════════════════════════════════
//  src/theme/index.js — Jetons de design FermI
//  Clair / sombre automatique (réglage système). Une seule couleur
//  d'accent (vert) ; le rouge/orange/bleu ne servent qu'au sens.
// ═══════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

export const lightColors = {
  bg: '#F4F5F1', surface: '#FFFFFF', surfaceAlt: '#EDEFE8', border: '#D9DED3',
  text: '#141C17', textSub: '#3F4D44', textMuted: '#5C6A60',
  primary: '#1B6B43', primaryPressed: '#14522F', onPrimary: '#FFFFFF', primarySoft: '#DDEFE4',
  success: '#1E7A3E', successSoft: '#DFF2E5',
  warning: '#8A5A00', warningSoft: '#FFF1D1',
  danger: '#B42318', dangerSoft: '#FDE7E4',
  info: '#1A5FA6', infoSoft: '#E1EEFA',
  overlay: 'rgba(12,22,16,0.55)',
};

export const darkColors = {
  bg: '#0F1512', surface: '#18201B', surfaceAlt: '#212B25', border: '#2E3A33',
  text: '#ECF1ED', textSub: '#BAC7BF', textMuted: '#93A298',
  primary: '#4CC38A', primaryPressed: '#3AA574', onPrimary: '#06210F', primarySoft: '#17382A',
  success: '#5DD28A', successSoft: '#173324',
  warning: '#F2B84B', warningSoft: '#3A2D10',
  danger: '#FF8A80', dangerSoft: '#3D1B18',
  info: '#7DB7F0', infoSoft: '#14293F',
  overlay: 'rgba(0,0,0,0.65)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  title:   { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body:    { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label:   { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '400' },
  numeric: { fontVariant: ['tabular-nums'] },
};

export function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return useMemo(() => ({ dark, c: dark ? darkColors : lightColors }), [dark]);
}

/** Fabrique un hook de styles dépendant du thème : makeStyles((c, t) => ({ ... })) */
export function makeStyles(factory) {
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme.c, theme)), [theme]);
  };
}

/** Couleurs d'une tonalité sémantique. */
export function toneColors(c, tone = 'neutral') {
  switch (tone) {
    case 'primary': return { fg: c.primary, bg: c.primarySoft };
    case 'success': return { fg: c.success, bg: c.successSoft };
    case 'warning': return { fg: c.warning, bg: c.warningSoft };
    case 'danger':  return { fg: c.danger,  bg: c.dangerSoft };
    case 'info':    return { fg: c.info,    bg: c.infoSoft };
    default:        return { fg: c.textSub, bg: c.surfaceAlt };
  }
}

export const TONE_ICON = {
  success: 'checkmark-circle', danger: 'alert-circle', warning: 'warning',
  info: 'information-circle', primary: 'information-circle', neutral: 'information-circle',
};
