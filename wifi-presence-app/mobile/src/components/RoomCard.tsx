import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoomState } from '../sensing/types';
import { colors, confidenceColor, font, radius, spacing } from '../theme/theme';

const MOTION_LABEL: Record<string, string> = {
  still: 'Still',
  walking: 'Walking',
  moving: 'Moving',
  unknown: 'Unknown',
};

export const RoomCard: React.FC<{ room: RoomState; onPress?: () => void }> = ({ room, onPress }) => {
  const active = room.occupied;
  const accent = active ? colors.presence : colors.textMuted;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.card}>
      <View style={[styles.accent, { backgroundColor: active ? colors.presence : colors.cardBorder }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{room.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.status, { color: accent }]}>{active ? 'Occupied' : 'Clear'}</Text>
          </View>
        </View>

        {active ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaStrong}>
              {room.personCount} {room.personCount === 1 ? 'person' : 'people'}
            </Text>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.meta}>{MOTION_LABEL[room.movement]}</Text>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={[styles.meta, { color: confidenceColor(room.confidenceLabel) }]}>
              {Math.round(room.confidence * 100)}%
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>No one detected</Text>
        )}

        <Text style={styles.sensors}>
          {room.sensorIds.length} sensor{room.sensorIds.length === 1 ? '' : 's'}
          {room.lastDetectedAt ? ` · last seen ${timeAgo(room.lastDetectedAt)}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: spacing(3),
  },
  accent: { width: 4 },
  body: { flex: 1, padding: spacing(4) },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.textPrimary, fontSize: font.h3, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing(1.5) },
  status: { fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(2) },
  metaStrong: { color: colors.textPrimary, fontSize: font.body, fontWeight: '700' },
  meta: { color: colors.textSecondary, fontSize: font.body },
  metaDivider: { color: colors.textMuted, marginHorizontal: spacing(2) },
  sensors: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing(2) },
});
