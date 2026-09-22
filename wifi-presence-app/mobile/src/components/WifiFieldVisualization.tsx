import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Rect,
  Stop,
  Text as SvgText,
  RadialGradient,
} from 'react-native-svg';
import { PersonDetection, RoomState } from '../sensing/types';
import { colors } from '../theme/theme';

/** COCO skeleton edges (indices into COCO_KEYPOINTS order). */
const SKELETON_EDGES: Array<[string, string]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  ['nose', 'left_shoulder'],
  ['nose', 'right_shoulder'],
];

interface Props {
  room: RoomState;
  width: number;
  height: number;
  /** furniture rects, normalized 0..1 */
  furniture?: Array<{ label: string; x: number; y: number; w: number; h: number }>;
}

/**
 * A stylized WiFi-sensing view of a room. It renders a signal field, room boundaries,
 * optional furniture, and each detected person as either a COCO skeleton (only when RuView
 * returns real keypoints) or a presence marker (the default — RuView's on-device pose is a
 * stub). It never draws detail the data does not support.
 */
export const WifiFieldVisualization: React.FC<Props> = ({ room, width, height, furniture }) => {
  const pad = 14;
  const W = width - pad * 2;
  const H = height - pad * 2;
  const nx = (x: number) => pad + x * W;
  const ny = (y: number) => pad + y * H;
  const active = room.occupied;
  const fieldColor = active ? colors.presence : colors.sense;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id="field" cx="50%" cy="50%" r="60%">
          <Stop offset="0%" stopColor={fieldColor} stopOpacity={active ? 0.22 : 0.12} />
          <Stop offset="100%" stopColor={fieldColor} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* room background + field glow */}
      <Rect x={pad} y={pad} width={W} height={H} rx={16} fill={colors.bgElevated} />
      <Rect x={pad} y={pad} width={W} height={H} rx={16} fill="url(#field)" />
      <Rect
        x={pad}
        y={pad}
        width={W}
        height={H}
        rx={16}
        fill="none"
        stroke={colors.cardBorder}
        strokeWidth={1.5}
      />

      {/* subcarrier grid — evokes CSI, not pixels */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Line
          key={`v${i}`}
          x1={nx((i + 1) / 7)}
          y1={ny(0)}
          x2={nx((i + 1) / 7)}
          y2={ny(1)}
          stroke={fieldColor}
          strokeOpacity={0.06}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <Line
          key={`h${i}`}
          x1={nx(0)}
          y1={ny((i + 1) / 5)}
          x2={nx(1)}
          y2={ny((i + 1) / 5)}
          stroke={fieldColor}
          strokeOpacity={0.06}
          strokeWidth={1}
        />
      ))}

      {/* furniture */}
      {furniture?.map((f) => (
        <G key={f.label}>
          <Rect
            x={nx(f.x)}
            y={ny(f.y)}
            width={f.w * W}
            height={f.h * H}
            rx={6}
            fill={colors.card}
            stroke={colors.cardBorder}
            strokeWidth={1}
          />
          <SvgText
            x={nx(f.x) + (f.w * W) / 2}
            y={ny(f.y) + (f.h * H) / 2 + 4}
            fill={colors.textMuted}
            fontSize={10}
            textAnchor="middle"
          >
            {f.label}
          </SvgText>
        </G>
      ))}

      {/* people */}
      {room.people.map((p) => (
        <PersonGlyph key={p.id} person={p} nx={nx} ny={ny} color={fieldColor} />
      ))}

      {/* empty-room hint */}
      {!active && (
        <SvgText x={width / 2} y={height / 2} fill={colors.textMuted} fontSize={13} textAnchor="middle">
          No presence detected
        </SvgText>
      )}
    </Svg>
  );
};

const PersonGlyph: React.FC<{
  person: PersonDetection;
  nx: (x: number) => number;
  ny: (y: number) => number;
  color: string;
}> = ({ person, nx, ny, color }) => {
  if (person.pose && person.pose.keypoints.length > 0) {
    return <Skeleton person={person} nx={nx} ny={ny} color={color} />;
  }
  return <Marker person={person} nx={nx} ny={ny} color={color} />;
};

const Marker: React.FC<{
  person: PersonDetection;
  nx: (x: number) => number;
  ny: (y: number) => number;
  color: string;
}> = ({ person, nx, ny, color }) => {
  const x = nx(person.position?.x ?? 0.5);
  const y = ny(person.position?.y ?? 0.5);
  const dir = person.movement?.direction;
  return (
    <G>
      <Circle cx={x} cy={y} r={26} fill={color} fillOpacity={0.1} />
      <Circle cx={x} cy={y} r={16} fill={color} fillOpacity={0.18} />
      <Circle cx={x} cy={y} r={8} fill={color} />
      {dir !== undefined && (
        <Line
          x1={x}
          y1={y}
          x2={x + 24 * Math.cos((dir * Math.PI) / 180)}
          y2={y + 24 * Math.sin((dir * Math.PI) / 180)}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      )}
    </G>
  );
};

const Skeleton: React.FC<{
  person: PersonDetection;
  nx: (x: number) => number;
  ny: (y: number) => number;
  color: string;
}> = ({ person, nx, ny, color }) => {
  const kp = new Map(person.pose!.keypoints.map((k) => [k.name, k]));
  return (
    <G>
      {SKELETON_EDGES.map(([a, b], i) => {
        const ka = kp.get(a);
        const kb = kp.get(b);
        if (!ka || !kb) return null;
        return (
          <Line
            key={i}
            x1={nx(ka.x)}
            y1={ny(ka.y)}
            x2={nx(kb.x)}
            y2={ny(kb.y)}
            stroke={color}
            strokeWidth={2.5}
            strokeOpacity={0.85}
            strokeLinecap="round"
          />
        );
      })}
      {person.pose!.keypoints.map((k, i) => (
        <Circle key={i} cx={nx(k.x)} cy={ny(k.y)} r={3} fill={color} fillOpacity={Math.max(0.3, k.confidence)} />
      ))}
    </G>
  );
};
