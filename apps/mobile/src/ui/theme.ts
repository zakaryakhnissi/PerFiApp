/**
 * PerFiApp design tokens — single source for colors, spacing, radii, and
 * type styles. Light theme for v1; screens consume tokens only (no raw hex
 * in screen files) so a dark theme can land later without touching flows.
 */
import { StyleSheet, TextStyle } from 'react-native';

export const color = {
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  ink: '#101828',
  inkMuted: '#5B6472',
  border: '#E3E8EF',
  primary: '#175CD3',
  primarySoft: '#EFF4FF',
  success: '#067647',
  successSoft: '#ECFDF3',
  warnSoft: '#FFFAEB',
  warnInk: '#93540A',
  danger: '#B42318',
  chipBg: '#F2F4F7',
  tabBar: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type_ = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: color.ink } as TextStyle,
  section: { fontSize: 15, fontWeight: '600', color: color.ink } as TextStyle,
  label: { fontSize: 13, fontWeight: '600', color: color.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 } as TextStyle,
  body: { fontSize: 15, color: color.ink } as TextStyle,
  small: { fontSize: 13, color: color.inkMuted, lineHeight: 18 } as TextStyle,
  value: { fontSize: 17, fontWeight: '700', color: color.success } as TextStyle,
});
