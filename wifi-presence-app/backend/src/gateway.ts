import http from 'node:http';
import WebSocket from 'ws';
import { GatewayConfig } from './config';
import { AuthService } from './auth';
import { RuViewAdapter } from './ruview/RuViewAdapter';
import { SensingNormalizer } from './ruview/normalize';
import { SensingService } from './sensingService';
import { RoomConfigStore } from './store/roomConfig';
import { EventStore } from './store/eventStore';
import { SettingsStore } from './store/settingsStore';
import { CalibrationService } from './server/calibration';
import { createHttpApp } from './server/httpApi';
import { WsHub } from './server/wsHub';

export interface Gateway {
  server: http.Server;
  sensing: SensingService;
  adapter: RuViewAdapter;
  wsHub: WsHub;
  rooms: RoomConfigStore;
  events: EventStore;
  listen(): Promise<number>;
  close(): Promise<void>;
}

/**
 * Assembles the whole gateway. `WsCtor`/`fetchImpl` are injectable so tests can run against
 * the mock RuView server (or an in-memory stub) with no real hardware.
 */
export function createGateway(
  cfg: GatewayConfig,
  deps: { WsCtor?: typeof WebSocket; fetchImpl?: typeof fetch } = {},
): Gateway {
  const auth = new AuthService(cfg.sharedSecret);
  const adapter = new RuViewAdapter(cfg, deps.WsCtor, deps.fetchImpl);
  const rooms = new RoomConfigStore(cfg.dataDir);
  const events = new EventStore(cfg.dataDir, cfg.eventRetentionDays);
  const settings = new SettingsStore(cfg);
  const normalizer = new SensingNormalizer(cfg, rooms);
  const sensing = new SensingService(cfg, adapter, normalizer, rooms, events);
  const calibration = new CalibrationService(adapter);

  const app = createHttpApp({ auth, sensing, rooms, events, settings, adapter, calibration });
  const server = http.createServer(app);
  const wsHub = new WsHub(server, auth, sensing);

  sensing.start();

  return {
    server,
    sensing,
    adapter,
    wsHub,
    rooms,
    events,
    listen: () =>
      new Promise<number>((resolve) => {
        server.listen(cfg.httpPort, () => {
          const addr = server.address();
          resolve(typeof addr === 'object' && addr ? addr.port : cfg.httpPort);
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        sensing.stop();
        wsHub.close();
        server.close(() => resolve());
      }),
  };
}
