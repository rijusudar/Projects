import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, font, radius, spacing } from '../theme/theme';

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const Pill: React.FC<{ label: string; color: string; filled?: boolean }> = ({
  label,
  color,
  filled,
}) => (
  <View
    style={[
      styles.pill,
      { borderColor: color, backgroundColor: filled ? color : 'transparent' },
    ]}
  >
    <View style={[styles.dot, { backgroundColor: filled ? colors.bg : color }]} />
    <Text style={[styles.pillText, { color: filled ? colors.bg : color }]}>{label}</Text>
  </View>
);

export const Row: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.row, style]}>{children}</View>
);

export const H1: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[styles.h1, style]}>{children}</Text>
);
export const H2: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[styles.h2, style]}>{children}</Text>
);
export const Body: React.FC<{ children: React.ReactNode; muted?: boolean; style?: TextStyle }> = ({
  children,
  muted,
  style,
}) => <Text style={[styles.body, muted && { color: colors.textMuted }, style]}>{children}</Text>;

export const Label: React.FC<{ children: React.ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[styles.label, style]}>{children}</Text>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing(4),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: spacing(2) },
  pillText: { fontSize: font.tiny, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  h1: { color: colors.textPrimary, fontSize: font.h1, fontWeight: '800', letterSpacing: 0.3 },
  h2: { color: colors.textPrimary, fontSize: font.h2, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: font.body },
  label: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
