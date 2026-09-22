import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, Label } from '../components/ui';
import { SensingBadge } from '../components/SensingBadge';
import { useSensing } from '../sensing/SensingProvider';
import { useNav } from '../navigation';
import { CalibrationSession, CalibrationStep } from '../sensing/types';
import { colors, font, radius, spacing } from '../theme/theme';

const STEPS: Array<{ step: CalibrationStep; title: string; body: string }> = [
  { step: 'select_room', title: 'Select room', body: 'Choose which room you are calibrating.' },
  { step: 'detect_nodes', title: 'Detect nodes', body: 'The gateway lists RuView nodes it can currently see.' },
  { step: 'position_sensors', title: 'Position sensors', body: 'Place nodes so the room sits between them for best coverage.' },
  { step: 'baseline_empty', title: 'Leave the room', body: 'RuView records an empty-room baseline. Please step out and stay out until prompted.' },
  { step: 'collect_occupied', title: 'Enter the room', body: 'Walk around normally so RuView can collect occupied samples.' },
  { step: 'validate', title: 'Validate', body: 'Confirm RuView detects you reliably before saving.' },
  { step: 'save', title: 'Save profile', body: 'Store the room profile via RuView’s adaptive classifier.' },
];

export const CalibrationScreen: React.FC = () => {
  const { client, rooms } = useSensing();
  const { params, navigate, goBack } = useNav();
  const initialRoom = (params.roomId as string) ?? rooms[0]?.roomId ?? 'living_room';
  const [session, setSession] = useState<CalibrationSession | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ profileSaved: boolean } | null>(null);

  const current = STEPS[index];
  const roomName = rooms.find((r) => r.roomId === initialRoom)?.name ?? initialRoom;

  const next = async () => {
    setBusy(true);
    try {
      let s = session;
      if (!s) s = await client.startCalibration(initialRoom);
      const step = STEPS[index].step;
      s = await client.advanceCalibration(s.sessionId, step);
      setSession(s);
      if (index === STEPS.length - 1) {
        const result = await client.finishCalibration(s.sessionId);
        setDone(result);
      } else {
        setIndex((i) => i + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <TopBar onBack={goBack} title="Calibration" />
        <Card style={styles.doneCard}>
          <Text style={styles.doneTitle}>{done.profileSaved ? '✓ Profile saved' : 'Flow complete'}</Text>
          <Text style={styles.doneBody}>
            {done.profileSaved
              ? `${roomName} is calibrated. Detection should now be more reliable.`
              : `The guided flow finished, but RuView did not confirm a saved profile (it may be running in mock/simulated mode). No profile was fabricated.`}
          </Text>
          <TouchableOpacity style={styles.primary} onPress={() => navigate('rooms')}>
            <Text style={styles.primaryText}>Back to rooms</Text>
          </TouchableOpacity>
        </Card>
        <SensingBadge />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar onBack={goBack} title={`Calibrate · ${roomName}`} />

      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View
            key={s.step}
            style={[
              styles.pip,
              i <= index && { backgroundColor: colors.sense },
              i === index && styles.pipActive,
            ]}
          />
        ))}
      </View>

      <Card style={styles.stepCard}>
        <Label>{`Step ${index + 1} of ${STEPS.length}`}</Label>
        <Text style={styles.stepTitle}>{current.title}</Text>
        <Text style={styles.stepBody}>{current.body}</Text>

        {current.step === 'baseline_empty' && (
          <Text style={styles.warn}>⚠ Do not enter the room during this step.</Text>
        )}
      </Card>

      <Text style={styles.note}>
        Calibration uses RuView’s own recording and adaptive-training endpoints — the app does not
        invent a calibration algorithm.
      </Text>

      <View style={styles.actions}>
        {index > 0 && (
          <TouchableOpacity style={styles.secondary} onPress={() => setIndex((i) => i - 1)} disabled={busy}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primary} onPress={next} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.primaryText}>{index === STEPS.length - 1 ? 'Finish & save' : 'Next'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <SensingBadge />
    </Screen>
  );
};

const TopBar: React.FC<{ onBack: () => void; title: string }> = ({ onBack, title }) => (
  <View style={styles.topbar}>
    <TouchableOpacity onPress={onBack}>
      <Text style={styles.back}>‹ Back</Text>
    </TouchableOpacity>
    <Text style={styles.title}>{title}</Text>
    <View style={{ width: 50 }} />
  </View>
);

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(5) },
  back: { color: colors.sense, fontSize: font.body, fontWeight: '600' },
  title: { color: colors.textPrimary, fontSize: font.h3, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: spacing(2), marginBottom: spacing(5) },
  pip: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder },
  pipActive: { height: 6, marginTop: -1 },
  stepCard: { marginBottom: spacing(4) },
  stepTitle: { color: colors.textPrimary, fontSize: font.h2, fontWeight: '800', marginTop: spacing(2) },
  stepBody: { color: colors.textSecondary, fontSize: font.body, lineHeight: 22, marginTop: spacing(2) },
  warn: { color: colors.warn, fontSize: font.small, marginTop: spacing(3), fontWeight: '600' },
  note: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 18, marginBottom: spacing(5) },
  actions: { flexDirection: 'row', gap: spacing(3), marginBottom: spacing(5) },
  primary: { flex: 1, backgroundColor: colors.senseDeep, borderRadius: radius.sm, paddingVertical: spacing(3.5), alignItems: 'center' },
  primaryText: { color: colors.bg, fontWeight: '800', fontSize: font.body },
  secondary: { flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.sm, paddingVertical: spacing(3.5), alignItems: 'center' },
  secondaryText: { color: colors.textSecondary, fontWeight: '700', fontSize: font.body },
  doneCard: { marginBottom: spacing(4), alignItems: 'flex-start' },
  doneTitle: { color: colors.presence, fontSize: font.h2, fontWeight: '800' },
  doneBody: { color: colors.textSecondary, fontSize: font.body, lineHeight: 22, marginTop: spacing(3), marginBottom: spacing(4) },
});
