/** Dark-first design tokens for the security-monitoring UI. */
export const colors = {
  bg: '#0A0E14',
  bgElevated: '#111823',
  card: '#141C28',
  cardBorder: '#1E2A3A',
  cardHover: '#182333',

  textPrimary: '#E8EEF5',
  textSecondary: '#9AA9BD',
  textMuted: '#5E6E82',

  // sensing accents (blue/green field aesthetic — explicitly "not video")
  sense: '#38BDF8', // cyan-blue
  senseDeep: '#0EA5E9',
  senseGlow: 'rgba(56, 189, 248, 0.18)',
  presence: '#34D399', // green
  presenceGlow: 'rgba(52, 211, 153, 0.18)',

  online: '#34D399',
  degraded: '#FBBF24',
  offline: '#F87171',

  high: '#34D399',
  medium: '#FBBF24',
  low: '#F87171',

  danger: '#F87171',
  warn: '#FBBF24',
} as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const spacing = (n: number): number => n * 4;

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export function confidenceColor(label: 'high' | 'medium' | 'low'): string {
  return colors[label];
}

export function statusColor(status: 'online' | 'offline' | 'degraded'): string {
  return colors[status];
}
