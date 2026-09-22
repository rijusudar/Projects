import { CalibrationSession, CalibrationStep } from '@wifi-presence/shared';
import { RuViewAdapter } from '../ruview/RuViewAdapter';

const STEP_ORDER: CalibrationStep[] = [
  'select_room',
  'detect_nodes',
  'position_sensors',
  'baseline_empty',
  'collect_occupied',
  'validate',
  'save',
];

/**
 * Orchestrates the guided calibration flow. It does NOT invent a calibration algorithm — it
 * drives RuView's own recording + adaptive-training endpoints (`/api/v1/recording/*`,
 * `/api/v1/adaptive/train`). When RuView is unreachable (e.g. mock mode) it still advances
 * the UI flow but marks the session as un-persisted so we never claim a real profile.
 */
export class CalibrationService {
  private sessions = new Map<string, CalibrationSession>();

  constructor(private readonly adapter: RuViewAdapter) {}

  start(roomId: string): CalibrationSession {
    const now = Date.now();
    const session: CalibrationSession = {
      sessionId: `cal_${now}_${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      step: 'select_room',
      startedAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string): CalibrationSession | undefined {
    return this.sessions.get(sessionId);
  }

  async advance(sessionId: string, step: CalibrationStep): Promise<CalibrationSession | undefined> {
    const s = this.sessions.get(sessionId);
    if (!s) return undefined;
    s.step = step;
    s.updatedAt = Date.now();

    if (step === 'baseline_empty') {
      const rec = await this.adapter.post<{ session_id?: string }>('/api/v1/recording/start');
      s.ruviewRecordingId = rec?.session_id;
      s.baselineFrames = rec ? 0 : undefined;
    }
    if (step === 'collect_occupied') {
      s.occupiedFrames = 0;
    }
    if (step === 'validate') {
      const status = await this.adapter.get<{ present?: boolean; confidence?: number }>(
        '/api/v1/sensing/latest',
      );
      s.validated = Boolean(status);
    }
    return s;
  }

  async finish(sessionId: string): Promise<{ ok: boolean; profileSaved: boolean }> {
    const s = this.sessions.get(sessionId);
    if (!s) return { ok: false, profileSaved: false };
    await this.adapter.post('/api/v1/recording/stop');
    // Kick RuView's adaptive classifier training from the labeled recording, if available.
    const trained = await this.adapter.post('/api/v1/adaptive/train', {
      room_id: s.roomId,
      recording_id: s.ruviewRecordingId,
    });
    s.step = 'save';
    s.updatedAt = Date.now();
    return { ok: true, profileSaved: Boolean(trained) };
  }

  static steps(): CalibrationStep[] {
    return [...STEP_ORDER];
  }
}
