/** Gateway configuration, from env with sane LAN-first defaults. */
export interface GatewayConfig {
  httpPort: number;
  /** RuView WebSocket sensing URL. */
  ruviewWsUrl: string;
  /** RuView REST base URL. */
  ruviewHttpUrl: string;
  /** Shared secret the mobile app exchanges for a bearer token. */
  sharedSecret: string;
  /** Frame is considered stale (RuView disconnected) after this many ms. */
  staleFrameMs: number;
  /** A sensor node missing this long is marked offline. */
  sensorStaleMs: number;
  /** Keypoints below this confidence are dropped (RuView on-device pose is a stub). */
  poseMinConfidence: number;
  /** Reconnect backoff. */
  reconnectBaseMs: number;
  reconnectMaxMs: number;
  /** Directory for JSON persistence. */
  dataDir: string;
  /** Vitals (breathing/heart) forwarded to clients only when true. Privacy default: off. */
  vitalsEnabled: boolean;
  eventRetentionDays: number;
  homeName: string;
}

function num(env: string | undefined, fallback: number): number {
  const n = env !== undefined ? Number(env) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    httpPort: num(env.GATEWAY_PORT, 8090),
    ruviewWsUrl: env.RUVIEW_WS_URL ?? 'ws://127.0.0.1:3001/ws/sensing',
    ruviewHttpUrl: env.RUVIEW_HTTP_URL ?? 'http://127.0.0.1:3000',
    sharedSecret: env.GATEWAY_SHARED_SECRET ?? 'dev-shared-secret',
    staleFrameMs: num(env.STALE_FRAME_MS, 5000),
    sensorStaleMs: num(env.SENSOR_STALE_MS, 8000),
    poseMinConfidence: num(env.POSE_MIN_CONFIDENCE, 0.3),
    reconnectBaseMs: num(env.RECONNECT_BASE_MS, 1000),
    reconnectMaxMs: num(env.RECONNECT_MAX_MS, 30000),
    dataDir: env.DATA_DIR ?? './data',
    vitalsEnabled: env.VITALS_ENABLED === 'true',
    eventRetentionDays: num(env.EVENT_RETENTION_DAYS, 30),
    homeName: env.HOME_NAME ?? 'Home',
  };
}
