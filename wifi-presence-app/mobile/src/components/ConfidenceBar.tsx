import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ConfidenceLabel } from '../sensing/types';
import { colors, confidenceColor, font, radius, spacing } from '../theme/theme';

const LABELS: Record<ConfidenceLabel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

/**
 * Renders an app-level confidence value. Never a CCTV-style accuracy — the label wording and
 * the "sensing confidence" caption make clear this is inferred.
 */
export const ConfidenceBar: React.FC<{ value: number; label: ConfidenceLabel }> = ({ value, label }) => {
  const color = confidenceColor(label);
  const pct = Math.round(value * 100);
  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color }]}>{LABELS[label]}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.caption}>sensing confidence · inferred from WiFi</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1.5) },
  label: { fontSize: font.small, fontWeight: '700' },
  pct: { color: colors.textSecondary, fontSize: font.small, fontWeight: '700' },
  track: { height: 8, backgroundColor: colors.bgElevated, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
  caption: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing(1.5) },
});
