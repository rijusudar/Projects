import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppEvent, HealthStatus, RoomState, SensorNode } from './types';
import { RuViewClient, SensingEvents } from './RuViewClient';
import { GatewayRuViewClient } from './RuViewClient';
import { MockRuViewClient } from './MockRuViewClient';
import { loadJson, saveJson } from './storage';
import { evaluateNotification, NotificationRule } from '../notifications/rules';

export interface AppConfig {
  mode: 'mock' | 'gateway';
  gatewayUrl: string;
  sharedSecret: string;
  clientId: string;
  notificationRules: NotificationRule[];
}

const DEFAULT_CONFIG: AppConfig = {
  mode: 'mock',
  gatewayUrl: 'http://192.168.1.50:8090',
  sharedSecret: 'dev-shared-secret',
  clientId: 'mobile-app',
  notificationRules: [],
};

interface SensingContextValue {
  client: RuViewClient;
  connection: SensingEvents['connection'];
  rooms: RoomState[];
  sensors: SensorNode[];
  health?: HealthStatus;
  recentEvents: AppEvent[];
  config: AppConfig;
  setConfig: (patch: Partial<AppConfig>) => Promise<void>;
  reconnect: () => void;
}

const SensingContext = createContext<SensingContextValue | null>(null);

const CONFIG_KEY = 'wpa.config.v1';

export const SensingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<AppConfig>(DEFAULT_CONFIG);
  const [connection, setConnection] = useState<SensingEvents['connection']>('disconnected');
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [sensors, setSensors] = useState<SensorNode[]>([]);
  const [health, setHealth] = useState<HealthStatus | undefined>();
  const [recentEvents, setRecentEvents] = useState<AppEvent[]>([]);
  const clientRef = useRef<RuViewClient | null>(null);
  const [loaded, setLoaded] = useState(false);

  // load persisted config once
  useEffect(() => {
    void (async () => {
      const stored = await loadJson<AppConfig>(CONFIG_KEY, DEFAULT_CONFIG);
      setConfigState(stored);
      setLoaded(true);
    })();
  }, []);

  // (re)create + connect the client whenever config mode/url changes
  useEffect(() => {
    if (!loaded) return;
    const client: RuViewClient =
      config.mode === 'gateway'
        ? new GatewayRuViewClient({
            baseUrl: config.gatewayUrl,
            clientId: config.clientId,
            sharedSecret: config.sharedSecret,
          })
        : new MockRuViewClient();
    clientRef.current = client;

    const unsubs = [
      client.subscribeConnection(setConnection),
      client.subscribePresence(setRooms),
      client.subscribeSensors(setSensors),
      client.subscribeHealth(setHealth),
      client.subscribeEvents((e) => {
        setRecentEvents((prev) => [e, ...prev].slice(0, 100));
        evaluateNotification(e, rooms, config.notificationRules);
      }),
    ];
    void client.connect().catch(() => setConnection('disconnected'));

    return () => {
      unsubs.forEach((u) => u());
      client.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, config.mode, config.gatewayUrl, config.sharedSecret]);

  const setConfig = async (patch: Partial<AppConfig>): Promise<void> => {
    const next = { ...config, ...patch };
    setConfigState(next);
    await saveJson(CONFIG_KEY, next);
  };

  const reconnect = (): void => {
    clientRef.current?.disconnect();
    void clientRef.current?.connect();
  };

  const value = useMemo<SensingContextValue>(
    () => ({
      client: clientRef.current ?? new MockRuViewClient(),
      connection,
      rooms,
      sensors,
      health,
      recentEvents,
      config,
      setConfig,
      reconnect,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connection, rooms, sensors, health, recentEvents, config],
  );

  return <SensingContext.Provider value={value}>{children}</SensingContext.Provider>;
};

export function useSensing(): SensingContextValue {
  const ctx = useContext(SensingContext);
  if (!ctx) throw new Error('useSensing must be used within SensingProvider');
  return ctx;
}
