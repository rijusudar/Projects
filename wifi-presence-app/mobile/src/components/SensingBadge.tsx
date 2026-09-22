import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme/theme';

/**
 * The always-visible reminder that this is inference from WiFi, not a camera feed. Required
 * everywhere a visualization appears so users never mistake it for video.
 */
export const SensingBadge: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <View style={[styles.wrap, compact && styles.compact]}>
    <View style={styles.icon}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.wave,
            { width: 4 + i * 5, height: 4 + i * 5, borderColor: colors.sense, opacity: 0.5 + i * 0.2 },
          ]}
        />
      ))}
    </View>
    <Text style={styles.text}>
      {compact ? 'WiFi sensing — not video' : 'WiFi sensing detects inferred presence and movement. It is not a video camera.'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.senseGlow,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  compact: { paddingVertical: spacing(1.5) },
  icon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing(2) },
  wave: { position: 'absolute', borderWidth: 1.5, borderRadius: 20 },
  text: { color: colors.sense, fontSize: font.tiny, flex: 1, fontWeight: '600' },
});
