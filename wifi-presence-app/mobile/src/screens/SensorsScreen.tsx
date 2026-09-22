import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, H1, Label } from '../components/ui';
import { useSensing } from '../sensing/SensingProvider';
import { SensorNode } from '../sensing/types';
import { colors, font, radius, spacing, statusColor } from '../theme/theme';

export const SensorsScreen: React.FC = () => {
  const { sensors, client } = useSensing();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});

  const test = async (s: SensorNode) => {
    setBusy(s.id);
    try {
      const r = await client.testSensor(s.id);
      setResult((prev) => ({ ...prev, [s.id]: r.ok ? `OK · ${r.message}` : `Failed · ${r.message}` }));
    } catch {
      setResult((prev) => ({ ...prev, [s.id]: 'Test failed' }));
    } finally {
      setBusy(null);
    }
  };

  const reconnect = async (s: SensorNode) => {
    setBusy(s.id);
    try {
      const r = await client.reconnectSensor(s.id);
      setResult((prev) => ({ ...prev, [s.id]: r.ok ? 'Reconnect requested' : 'Reconnect failed' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <H1>Sensors</H1>
      <Text style={styles.subtitle}>
        {sensors.filter((s) => s.status === 'online').length}/{sensors.length} RuView nodes online
      </Text>

      {sensors.map((s) => (
        <Card key={s.id} style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.sub}>
                {s.type.toUpperCase()} · node {s.id}
                {s.ipAddress ? ` · ${s.ipAddress}` : ''}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: statusColor(s.status) }]} />
              <Text style={[styles.status, { color: statusColor(s.status) }]}>{s.status}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <Field label="Signal" value={s.rssiDbm !== undefined ? `${Math.round(s.rssiDbm)} dBm` : '—'} />
            <Field label="Quality" value={s.signalQuality ?? '—'} />
            <Field label="CSI" value={s.csiAvailable ? `${Math.round(s.csiFps ?? 0)} fps` : 'unavailable'} />
            <Field label="Firmware" value={s.firmware ?? '—'} />
            <Field label="Calibrated" value={s.calibrated ? 'yes' : 'no'} />
            <Field label="Last packet" value={s.lastPacketAt ? timeAgo(s.lastPacketAt) : '—'} />
          </View>

          {result[s.id] && <Text style={styles.result}>{result[s.id]}</Text>}

          <View style={styles.actions}>
            <Action label="Test" onPress={() => test(s)} busy={busy === s.id} />
            <Action label="Reconnect" onPress={() => reconnect(s)} busy={busy === s.id} />
          </View>
        </Card>
      ))}

      <Label>CSI availability</Label>
      <Text style={styles.note}>
        Full CSI sensing needs ESP32-S3 / ESP32-C6 nodes. Original ESP32 and ESP32-C3 are not
        supported by RuView. Coverage improves with more nodes per room.
      </Text>
    </Screen>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

const Action: React.FC<{ label: string; onPress: () => void; busy: boolean }> = ({ label, onPress, busy }) => (
  <TouchableOpacity style={styles.action} onPress={onPress} disabled={busy}>
    {busy ? <ActivityIndicator color={colors.sense} size="small" /> : <Text style={styles.actionText}>{label}</Text>}
  </TouchableOpacity>
);

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const styles = StyleSheet.create({
  subtitle: { color: colors.textSecondary, fontSize: font.body, marginTop: spacing(1), marginBottom: spacing(5) },
  card: { marginBottom: spacing(3) },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { color: colors.textPrimary, fontSize: font.h3, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing(1) },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing(1.5) },
  status: { fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing(3) },
  field: { width: '33%', marginBottom: spacing(3) },
  fieldLabel: { color: colors.textMuted, fontSize: font.tiny },
  fieldValue: { color: colors.textPrimary, fontSize: font.small, fontWeight: '600', marginTop: spacing(0.5) },
  result: { color: colors.sense, fontSize: font.small, marginBottom: spacing(2) },
  actions: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(1) },
  action: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
  },
  actionText: { color: colors.sense, fontSize: font.small, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: font.small, marginTop: spacing(2), lineHeight: 19 },
});
