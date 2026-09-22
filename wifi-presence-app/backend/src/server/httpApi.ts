import express, { NextFunction, Request, Response } from 'express';
import { AuthService } from '../auth';
import { SensingService } from '../sensingService';
import { RoomConfigStore } from '../store/roomConfig';
import { EventStore } from '../store/eventStore';
import { SettingsStore } from '../store/settingsStore';
import { RuViewAdapter } from '../ruview/RuViewAdapter';
import { CalibrationService } from './calibration';

export interface HttpDeps {
  auth: AuthService;
  sensing: SensingService;
  rooms: RoomConfigStore;
  events: EventStore;
  settings: SettingsStore;
  adapter: RuViewAdapter;
  calibration: CalibrationService;
}

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

export function createHttpApp(deps: HttpDeps): express.Express {
  const app = express();
  app.use(express.json());

  // --- open endpoints ---
  app.get('/health', (_req, res) => res.json(deps.sensing.getHealth()));

  app.post('/auth/token', (req, res) => {
    const { clientId, secret } = req.body ?? {};
    if (typeof clientId !== 'string' || typeof secret !== 'string') {
      return fail(res, 400, 'bad_request', 'clientId and secret are required');
    }
    const issued = deps.auth.issue(clientId, secret);
    if (!issued) return fail(res, 401, 'unauthorized', 'invalid credentials');
    return res.json(issued);
  });

  // --- auth guard for everything below ---
  const guard = (req: Request, res: Response, next: NextFunction): void => {
    const token = AuthService.bearer(req.header('authorization'));
    if (!deps.auth.verify(token)) {
      fail(res, 401, 'unauthorized', 'missing or invalid bearer token');
      return;
    }
    next();
  };
  app.use(guard);

  // --- rooms ---
  app.get('/rooms', (_req, res) => res.json(deps.sensing.getRooms()));
  app.get('/rooms/:id', (req, res) => {
    const room = deps.sensing.getRooms().find((r) => r.roomId === req.params.id);
    if (!room) return fail(res, 404, 'not_found', 'room not found');
    return res.json(room);
  });
  app.post('/rooms', (req, res) => {
    const { name, nodeIds, furniture } = req.body ?? {};
    if (typeof name !== 'string' || !Array.isArray(nodeIds)) {
      return fail(res, 400, 'bad_request', 'name and nodeIds[] are required');
    }
    return res.json(deps.rooms.create({ name, nodeIds, furniture }));
  });
  app.put('/rooms/:id', (req, res) => {
    const updated = deps.rooms.update(req.params.id, req.body ?? {});
    if (!updated) return fail(res, 404, 'not_found', 'room not found');
    return res.json(updated);
  });
  app.delete('/rooms/:id', (req, res) => {
    const ok = deps.rooms.remove(req.params.id);
    if (!ok) return fail(res, 404, 'not_found', 'room not found');
    return res.json({ ok: true });
  });

  // --- sensors ---
  app.get('/sensors', (_req, res) => res.json(deps.sensing.getSensors()));
  app.post('/sensors/:id/test', async (req, res) => {
    const sensor = deps.sensing.getSensors().find((s) => s.id === req.params.id);
    if (!sensor) return fail(res, 404, 'not_found', 'sensor not found');
    const health = await deps.adapter.getHealth();
    return res.json({
      ok: sensor.status === 'online' && Boolean(health),
      rssiDbm: sensor.rssiDbm,
      csiFps: sensor.csiFps,
      message: health ? 'RuView reachable; sensor responding' : 'RuView unreachable',
    });
  });
  app.post('/sensors/:id/reconnect', async (req, res) => {
    const snap = await deps.adapter.get(`/api/v1/nodes/${req.params.id}/sync`);
    return res.json({ ok: Boolean(snap) });
  });

  // --- events ---
  app.get('/events', (req, res) => {
    const { limit, since, roomId, type } = req.query;
    res.json(
      deps.events.query({
        limit: limit ? Number(limit) : 200,
        since: since ? Number(since) : undefined,
        roomId: typeof roomId === 'string' ? roomId : undefined,
        type: typeof type === 'string' ? type : undefined,
      }),
    );
  });
  app.delete('/events', (_req, res) => res.json({ deleted: deps.events.clear() }));

  // --- settings ---
  app.get('/settings', (_req, res) => res.json(deps.settings.get()));
  app.put('/settings', (req, res) => res.json(deps.settings.update(req.body ?? {})));

  // --- calibration (proxies RuView's own mechanisms) ---
  app.post('/calibration/start', (req, res) => {
    const { roomId } = req.body ?? {};
    if (typeof roomId !== 'string') return fail(res, 400, 'bad_request', 'roomId required');
    return res.json(deps.calibration.start(roomId));
  });
  app.get('/calibration/:sessionId', (req, res) => {
    const s = deps.calibration.get(req.params.sessionId);
    if (!s) return fail(res, 404, 'not_found', 'session not found');
    return res.json(s);
  });
  app.post('/calibration/:sessionId/step', async (req, res) => {
    const s = await deps.calibration.advance(req.params.sessionId, req.body?.step);
    if (!s) return fail(res, 404, 'not_found', 'session not found');
    return res.json(s);
  });
  app.post('/calibration/:sessionId/finish', async (req, res) => {
    return res.json(await deps.calibration.finish(req.params.sessionId));
  });

  return app;
}
