import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, Label } from '../components/ui';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { SensingBadge } from '../components/SensingBadge';
import { WifiFieldVisualization } from '../components/WifiFieldVisualization';
import { useSensing } from '../sensing/SensingProvider';
import { useNav } from '../navigation';
import { colors, font, radius, spacing } from '../theme/theme';

const MOTION_LABEL: Record<string, string> = {
  still: 'Still',
  walking: 'Walking',
  moving: 'Moving',
  unknown: 'Unknown',
};

export const LiveRoomScreen: React.FC = () => {
  const { rooms } = useSensing();
  const { params, goBack } = useNav();
  const roomId = params.roomId as string;
  const room = rooms.find((r) => r.roomId === roomId);
  const vizWidth = Dimensions.get('window').width - spacing(8);

  if (!room) {
    return (
      <Screen>
        <TopBar onBack={goBack} title="Live Room" live={false} />
        <Text style={styles.missing}>Room not available.</Text>
      </Screen>
    );
  }

  const usingPose = room.people.some((p) => p.pose);

  return (
    <Screen>
      <TopBar onBack={goBack} title={room.name} live={room.occupied} />

      <View style={styles.viz}>
        <WifiFieldVisualization room={room} width={vizWidth} height={vizWidth * 0.85} />
      </View>

      <View style={{ marginBottom: spacing(4) }}>
        <SensingBadge />
      </View>

      <View style={styles.metricsRow}>
        <Metric label="People" value={String(room.personCount)} accent={colors.presence} />
        <Metric label="Motion" value={MOTION_LABEL[room.movement]} accent={colors.sense} />
        <Metric
          label="Render"
          value={usingPose ? 'Skeleton' : 'Marker'}
          accent={colors.textSecondary}
        />
      </View>

      <Card style={{ marginTop: spacing(4) }}>
        <ConfidenceBar value={room.confidence} label={room.confidenceLabel} />
      </Card>

      {!usingPose && (
        <Card style={{ marginTop: spacing(4) }}>
          <Label>Why a marker, not a skeleton?</Label>
          <Text style={styles.note}>
            RuView’s on-device pose model is experimental and returns low-confidence keypoints on
            single-node setups, so this room shows an approximate presence marker instead of a
            full skeleton. When the sensing backend returns confident keypoints, the skeleton
            renders automatically.
          </Text>
        </Card>
      )}

      {room.vitals && (
        <Card style={{ marginTop: spacing(4) }}>
          <Label>Vital signs (opt-in)</Label>
          <View style={styles.vitalsRow}>
            <Text style={styles.vital}>{room.vitals.breathingBpm ?? '—'} breaths/min</Text>
            <Text style={styles.vital}>{room.vitals.heartBpm ?? '—'} bpm</Text>
          </View>
        </Card>
      )}
    </Screen>
  );
};

const TopBar: React.FC<{ onBack: () => void; title: string; live: boolean }> = ({ onBack, title, live }) => (
  <View style={styles.topbar}>
    <TouchableOpacity onPress={onBack} style={styles.back}>
      <Text style={styles.backText}>‹ Back</Text>
    </TouchableOpacity>
    <Text style={styles.title}>{title}</Text>
    <View style={[styles.livePill, { borderColor: live ? colors.presence : colors.textMuted }]}>
      <View style={[styles.liveDot, { backgroundColor: live ? colors.presence : colors.textMuted }]} />
      <Text style={[styles.liveText, { color: live ? colors.presence : colors.textMuted }]}>LIVE</Text>
    </View>
  </View>
);

const Metric: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <Card style={styles.metric}>
    <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(4) },
  back: { minWidth: 60 },
  backText: { color: colors.sense, fontSize: font.body, fontWeight: '600' },
  title: { color: colors.textPrimary, fontSize: font.h3, fontWeight: '700' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    minWidth: 60,
    justifyContent: 'center',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing(1.5) },
  liveText: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 },
  viz: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing(4),
    alignItems: 'center',
  },
  metricsRow: { flexDirection: 'row', gap: spacing(3) },
  metric: { flex: 1, alignItems: 'center', paddingVertical: spacing(4) },
  metricValue: { fontSize: font.h3, fontWeight: '800' },
  metricLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing(1) },
  note: { color: colors.textSecondary, fontSize: font.small, lineHeight: 20, marginTop: spacing(2) },
  vitalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing(2) },
  vital: { color: colors.textPrimary, fontSize: font.body, fontWeight: '700' },
  missing: { color: colors.textMuted, fontSize: font.body },
});
