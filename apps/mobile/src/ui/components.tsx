/**
 * Small reusable UI primitives. Purely presentational — they forward
 * accessibility props untouched so acceptance tests and screen readers see
 * the same surface as before styling.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { color, radius, space, type_ } from './theme';

export function ScreenTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Text accessibilityRole="header" style={[type_.title, { marginBottom: space.lg }]}>
      {children}
    </Text>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={[type_.label, { marginBottom: space.sm, marginTop: space.md }]}>{children}</Text>;
}

export function Card({ style, ...props }: ViewProps): React.JSX.Element {
  return <View {...props} style={[styles.card, style]} />;
}

export function Input(props: TextInputProps): React.JSX.Element {
  return <TextInput placeholderTextColor={color.inkMuted} {...props} style={[styles.input, props.style]} />;
}

export function Chip({
  label,
  selected,
  onPress,
  role = 'button',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: 'button' | 'switch';
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'switch' ? { checked: selected } : { selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.chipRow}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.primaryBtn}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.ghostBtn}>
      <Text style={[styles.ghostBtnText, destructive && { color: color.danger }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warn';
}): React.JSX.Element {
  const tones = {
    neutral: { backgroundColor: color.chipBg, color: color.inkMuted },
    primary: { backgroundColor: color.primarySoft, color: color.primary },
    success: { backgroundColor: color.successSoft, color: color.success },
    warn: { backgroundColor: color.warnSoft, color: color.warnInk },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tones.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: tones.color }]}>{label}</Text>
    </View>
  );
}

export function Notice({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'warn';
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.notice,
        tone === 'warn' && { backgroundColor: color.warnSoft, borderColor: '#FEDF89' },
      ]}
    >
      <Text style={[type_.small, tone === 'warn' && { color: color.warnInk }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    marginBottom: space.md,
  },
  input: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 15,
    color: color.ink,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.chipBg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: { backgroundColor: color.primarySoft, borderColor: color.primary },
  chipText: { fontSize: 14, color: color.ink },
  chipTextSelected: { color: color.primary, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: color.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: space.lg,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  ghostBtn: { paddingVertical: space.sm, paddingHorizontal: space.md },
  ghostBtnText: { color: color.primary, fontSize: 14, fontWeight: '600' },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  notice: {
    backgroundColor: color.chipBg,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.md,
  },
});
