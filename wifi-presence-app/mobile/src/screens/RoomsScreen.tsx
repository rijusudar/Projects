import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/Screen';
import { H1, Label } from '../components/ui';
import { RoomCard } from '../components/RoomCard';
import { useSensing } from '../sensing/SensingProvider';
import { useNav } from '../navigation';
import { colors, font, radius, spacing } from '../theme/theme';

export const RoomsScreen: React.FC = () => {
  const { rooms } = useSensing();
  const { navigate } = useNav();

  return (
    <Screen>
      <H1>Rooms</H1>
      <Text style={styles.subtitle}>Tap a room for the live WiFi view, or calibrate it.</Text>

      {rooms.map((room) => (
        <View key={room.roomId}>
          <RoomCard room={room} onPress={() => navigate('live', { roomId: room.roomId })} />
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.action}
              onPress={() => navigate('calibration', { roomId: room.roomId })}
            >
              <Text style={styles.actionText}>Calibrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addRoom} onPress={() => navigate('calibration', {})}>
        <Text style={styles.addRoomText}>+ Add / calibrate a room</Text>
      </TouchableOpacity>

      <Label>Rooms are an app concept</Label>
      <Text style={styles.note}>
        RuView senses per node; the app maps each node to a room. Assign nodes to rooms during
        calibration or in Sensors.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  subtitle: { color: colors.textSecondary, fontSize: font.body, marginTop: spacing(1), marginBottom: spacing(5) },
  actions: { flexDirection: 'row', marginTop: -spacing(1), marginBottom: spacing(4) },
  action: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  actionText: { color: colors.sense, fontSize: font.small, fontWeight: '600' },
  addRoom: {
    borderWidth: 1,
    borderColor: colors.sense,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing(4),
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  addRoomText: { color: colors.sense, fontSize: font.body, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: font.small, marginTop: spacing(2), lineHeight: 19 },
});
