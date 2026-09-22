import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { H1 } from '../components/ui';
import { useSensing } from '../sensing/SensingProvider';
import { AppEvent, AppEventType } from '../sensing/types';
import { colors, font, radius, spacing } from '../theme/theme';

const META: Record<AppEventType, { label: string; color: string; icon: string }> = {
  person_detected: { label: 'Person detected', color: colors.presence, icon: '●' },
  person_entered: { label: 'Person entered', color: colors.presence, icon: '→' },
  person_left: { label: 'Person left', color: colors.sense, icon: '←' },
  room_empty: { label: 'Room became empty', color: colors.textMuted, icon: '○' },
  movement_detected: { label: 'Movement detected', color: colors.sense, icon: '↗' },
  no_movement: { label: 'No movement', color: colors.warn, icon: '‖' },
  sensor_disconnected: { label: 'Sensor disconnected', color: colors.offline, icon: '⚠' },
  sensor_reconnected: { label: 'Sensor reconnected', color: colors.online, icon: '✓' },
  system_offline: { label: 'System offline', color: colors.offline, icon: '⚠' },
  system_online: { label: 'System online', color: colors.online, icon: '✓' },
};

export const EventsScreen: React.FC = () => {
  const { client, recentEvents, rooms } = useSensing();
  const [stored, setStored] = useState<AppEvent[]>([]);

  useEffect(() => {
    void client.getEvents({ limit: 200 }).then(setStored).catch(() => setStored([]));
  }, [client]);

  const merged = useMemo(() => {
    const byId = new Map<string, AppEvent>();
    [...recentEvents, ...stored].forEach((e) => byId.set(e.id, e));
    return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
  }, [recentEvents, stored]);

  const roomName = (id?: string) => rooms.find((r) => r.roomId === id)?.name ?? id;

  const clear = async () => {
    await client.clearEvents();
    setStored([]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <H1>Events</H1>
        <TouchableOpacity onPress={clear} style={styles.clear}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Stored locally on your gateway · {merged.length} events</Text>

      {merged.length === 0 && <Text style={styles.empty}>No events yet.</Text>}

      {merged.map((e) => {
        const m = META[e.type];
        return (
          <View key={e.id} style={styles.row}>
            <Text style={styles.time}>
              {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={[styles.rail, { backgroundColor: m.color }]} />
            <View style={styles.body}>
              <Text style={[styles.label, { color: m.color }]}>
                {m.icon} {m.label}
              </Text>
              <Text style={styles.detail}>
                {roomName(e.roomId) ? `${roomName(e.roomId)}` : e.sensorId ? `Sensor ${e.sensorId}` : 'System'}
                {e.confidence !== undefined ? ` · ${Math.round(e.confidence * 100)}% confidence` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clear: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.sm, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5) },
  clearText: { color: colors.offline, fontSize: font.small, fontWeight: '600' },
  subtitle: { color: colors.textSecondary, fontSize: font.small, marginTop: spacing(1), marginBottom: spacing(5) },
  empty: { color: colors.textMuted, fontSize: font.body },
  row: { flexDirection: 'row', marginBottom: spacing(4) },
  time: { color: colors.textMuted, fontSize: font.tiny, width: 52, marginTop: spacing(0.5) },
  rail: { width: 3, borderRadius: 2, marginHorizontal: spacing(3) },
  body: { flex: 1 },
  label: { fontSize: font.body, fontWeight: '700' },
  detail: { color: colors.textSecondary, fontSize: font.small, marginTop: spacing(1) },
});
