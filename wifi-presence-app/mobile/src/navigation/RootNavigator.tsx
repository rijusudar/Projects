import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabName, useNav } from './index';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RoomsScreen } from '../screens/RoomsScreen';
import { LiveRoomScreen } from '../screens/LiveRoomScreen';
import { SensorsScreen } from '../screens/SensorsScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CalibrationScreen } from '../screens/CalibrationScreen';
import { colors, font, spacing } from '../theme/theme';

const TAB_META: Array<{ tab: TabName; label: string; icon: string }> = [
  { tab: 'dashboard', label: 'Home', icon: '⌂' },
  { tab: 'rooms', label: 'Rooms', icon: '▤' },
  { tab: 'sensors', label: 'Sensors', icon: '⛭' },
  { tab: 'events', label: 'Events', icon: '≣' },
  { tab: 'settings', label: 'Settings', icon: '⚙' },
];

export const RootNavigator: React.FC = () => {
  const { screen, activeTab, navigate } = useNav();

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {screen === 'dashboard' && <DashboardScreen />}
        {screen === 'rooms' && <RoomsScreen />}
        {screen === 'sensors' && <SensorsScreen />}
        {screen === 'events' && <EventsScreen />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'live' && <LiveRoomScreen />}
        {screen === 'calibration' && <CalibrationScreen />}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.tabbarSafe}>
        <View style={styles.tabbar}>
          {TAB_META.map((t) => {
            const active = activeTab === t.tab;
            return (
              <TouchableOpacity key={t.tab} style={styles.tab} onPress={() => navigate(t.tab)}>
                <Text style={[styles.icon, { color: active ? colors.sense : colors.textMuted }]}>{t.icon}</Text>
                <Text style={[styles.label, { color: active ? colors.sense : colors.textMuted }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  tabbarSafe: { backgroundColor: colors.bgElevated, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  tabbar: { flexDirection: 'row', paddingTop: spacing(2) },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing(1) },
  icon: { fontSize: 20 },
  label: { fontSize: font.tiny, marginTop: spacing(1), fontWeight: '600' },
});
