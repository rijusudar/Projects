import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, H1, Label, Pill } from '../components/ui';
import { RoomCard } from '../components/RoomCard';
import { SensingBadge } from '../components/SensingBadge';
import { useSensing } from '../sensing/SensingProvider';
import { useNav } from '../navigation';
import { colors, font, spacing } from '../theme/theme';

export const DashboardScreen: React.FC = () => {
  const { rooms, health, config, connection } = useSensing();
  const { navigate } = useNav();

  const online = connection === 'connected' && health?.system === 'online';
  const occupied = rooms.filter((r) => r.occupied).length;
  const people = rooms.reduce((a, r) => a + r.personCount, 0);
  const sensors = health?.sensors ?? { online: 0, total: 0 };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Label>Home</Label>
          <H1>{config.mode === 'gateway' ? health?.ruview.source ?? 'Home' : 'My Home'}</H1>
        </View>
        <Pill
          label={online ? 'System Online' : 'Offline'}
          color={online ? colors.online : colors.offline}
          filled={online}
        />
      </View>

      <View style={styles.stats}>
        <Stat value={String(people)} label="People detected" accent={colors.presence} />
        <Stat value={`${occupied}`} label="Occupied rooms" accent={colors.sense} />
        <Stat value={`${sensors.online}/${sensors.total}`} label="Sensors online" accent={colors.online} />
      </View>

      <Card style={styles.confidenceCard}>
        <View style={styles.confRow}>
          <View>
            <Label>Overall sensing confidence</Label>
            <Text style={styles.confValue}>{Math.round((health?.overallConfidence ?? 0) * 100)}%</Text>
          </View>
          <View style={styles.updated}>
            <Text style={styles.updatedLabel}>Last update</Text>
            <Text style={styles.updatedValue}>
              {health ? new Date(health.updatedAt).toLocaleTimeString() : '—'}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Label>Rooms</Label>
      </View>
      {rooms
        .filter((r) => r.roomId !== 'unassigned')
        .map((room) => (
          <RoomCard key={room.roomId} room={room} onPress={() => navigate('live', { roomId: room.roomId })} />
        ))}

      <View style={{ marginTop: spacing(2) }}>
        <SensingBadge />
      </View>
    </Screen>
  );
};

const Stat: React.FC<{ value: string; label: string; accent: string }> = ({ value, label, accent }) => (
  <Card style={styles.stat}>
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(5),
  },
  stats: { flexDirection: 'row', gap: spacing(3), marginBottom: spacing(3) },
  stat: { flex: 1, paddingVertical: spacing(4) },
  statValue: { fontSize: font.h1, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing(1) },
  confidenceCard: { marginBottom: spacing(5) },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confValue: { color: colors.textPrimary, fontSize: font.h2, fontWeight: '800', marginTop: spacing(1) },
  updated: { alignItems: 'flex-end' },
  updatedLabel: { color: colors.textMuted, fontSize: font.tiny },
  updatedValue: { color: colors.textSecondary, fontSize: font.small, marginTop: spacing(1) },
  sectionHeader: { marginBottom: spacing(3) },
});
