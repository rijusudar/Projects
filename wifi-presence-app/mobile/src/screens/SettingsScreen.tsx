import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card, H1, Label } from '../components/ui';
import { SensingBadge } from '../components/SensingBadge';
import { useSensing } from '../sensing/SensingProvider';
import { GatewaySettings } from '../sensing/types';
import { DEFAULT_RULES, NotificationRule } from '../notifications/rules';
import { colors, font, radius, spacing } from '../theme/theme';

export const SettingsScreen: React.FC = () => {
  const { config, setConfig, client, reconnect, connection } = useSensing();
  const [gwSettings, setGwSettings] = useState<GatewaySettings | null>(null);
  const [url, setUrl] = useState(config.gatewayUrl);
  const [secret, setSecret] = useState(config.sharedSecret);

  useEffect(() => {
    void client.getSettings().then(setGwSettings).catch(() => setGwSettings(null));
  }, [client]);

  const rules = config.notificationRules.length ? config.notificationRules : DEFAULT_RULES;

  const toggleRule = (rule: NotificationRule) => {
    const next = rules.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    void setConfig({ notificationRules: next });
  };

  const setVitals = async (v: boolean) => {
    const s = await client.updateSettings({ vitalsEnabled: v });
    setGwSettings(s);
  };

  return (
    <Screen>
      <H1>Settings</H1>

      <Card style={styles.card}>
        <Label>Sensing source</Label>
        <View style={styles.modeRow}>
          <ModeButton
            active={config.mode === 'mock'}
            label="Mock (no hardware)"
            onPress={() => setConfig({ mode: 'mock' })}
          />
          <ModeButton
            active={config.mode === 'gateway'}
            label="Gateway"
            onPress={() => setConfig({ mode: 'gateway' })}
          />
        </View>
        <Text style={styles.status}>
          Connection: <Text style={{ color: connection === 'connected' ? colors.online : colors.offline }}>{connection}</Text>
        </Text>

        {config.mode === 'gateway' && (
          <View style={{ marginTop: spacing(3) }}>
            <Label>Gateway URL</Label>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              placeholder="http://192.168.1.50:8090"
              placeholderTextColor={colors.textMuted}
            />
            <Label>Shared secret</Label>
            <TextInput
              style={styles.input}
              value={secret}
              onChangeText={setSecret}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={() => {
                void setConfig({ gatewayUrl: url, sharedSecret: secret }).then(reconnect);
              }}
            >
              <Text style={styles.connectText}>Save & connect</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.rowTitle}>Vital signs</Text>
            <Text style={styles.rowSub}>Breathing & heart rate. Off by default for privacy.</Text>
          </View>
          <Switch
            value={gwSettings?.vitalsEnabled ?? false}
            onValueChange={setVitals}
            trackColor={{ true: colors.senseDeep, false: colors.cardBorder }}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Label>Notifications</Label>
        {rules.map((rule) => (
          <View key={rule.id} style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.rowTitle}>{ruleLabel(rule.type)}</Text>
              <Text style={styles.rowSub}>{rule.roomId ? rule.roomId : 'All rooms'}</Text>
            </View>
            <Switch
              value={rule.enabled}
              onValueChange={() => toggleRule(rule)}
              trackColor={{ true: colors.senseDeep, false: colors.cardBorder }}
            />
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Label>Data & privacy</Label>
        <Text style={styles.rowSub}>
          Retention: {gwSettings?.eventRetentionDays ?? 30} days · events stored locally only.
        </Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => void client.clearEvents()}
        >
          <Text style={styles.deleteText}>Delete event history</Text>
        </TouchableOpacity>
      </Card>

      <SensingBadge />
      <Text style={styles.disclaimer}>
        This system infers presence and movement from WiFi signals. It cannot identify a specific
        person, read faces or clothing, or produce a camera image. Detection is not guaranteed
        through every wall or for every person.
      </Text>
    </Screen>
  );
};

const ModeButton: React.FC<{ active: boolean; label: string; onPress: () => void }> = ({ active, label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.mode, active && { borderColor: colors.sense, backgroundColor: colors.senseGlow }]}
  >
    <Text style={[styles.modeText, active && { color: colors.sense }]}>{label}</Text>
  </TouchableOpacity>
);

function ruleLabel(type: NotificationRule['type']): string {
  return type.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  card: { marginTop: spacing(4) },
  modeRow: { flexDirection: 'row', gap: spacing(3), marginTop: spacing(3) },
  mode: { flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.sm, paddingVertical: spacing(3), alignItems: 'center' },
  modeText: { color: colors.textSecondary, fontSize: font.small, fontWeight: '600' },
  status: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing(3) },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    marginTop: spacing(1.5),
    marginBottom: spacing(3),
    fontSize: font.body,
  },
  connectBtn: { backgroundColor: colors.senseDeep, borderRadius: radius.sm, paddingVertical: spacing(3), alignItems: 'center' },
  connectText: { color: colors.bg, fontWeight: '800', fontSize: font.body },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(2) },
  switchText: { flex: 1, paddingRight: spacing(3) },
  rowTitle: { color: colors.textPrimary, fontSize: font.body, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing(1) },
  deleteBtn: { marginTop: spacing(3), borderWidth: 1, borderColor: colors.offline, borderRadius: radius.sm, paddingVertical: spacing(3), alignItems: 'center' },
  deleteText: { color: colors.offline, fontWeight: '700', fontSize: font.small },
  disclaimer: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 18, marginTop: spacing(3) },
});
