import path from 'node:path';
import { GatewaySettings } from '@wifi-presence/shared';
import { GatewayConfig } from '../config';
import { readJson, writeJson } from './jsonFile';

export class SettingsStore {
  private settings: GatewaySettings;
  private readonly file: string;

  constructor(cfg: GatewayConfig) {
    this.file = path.join(cfg.dataDir, 'settings.json');
    this.settings = readJson<GatewaySettings>(this.file, {
      homeName: cfg.homeName,
      vitalsEnabled: cfg.vitalsEnabled,
      eventRetentionDays: cfg.eventRetentionDays,
      poseMinConfidence: cfg.poseMinConfidence,
    });
  }

  get(): GatewaySettings {
    return { ...this.settings };
  }

  update(patch: Partial<GatewaySettings>): GatewaySettings {
    this.settings = { ...this.settings, ...patch };
    writeJson(this.file, this.settings);
    return this.get();
  }
}
