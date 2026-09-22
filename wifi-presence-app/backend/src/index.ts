import { loadConfig } from './config';
import { createGateway } from './gateway';
import { MockRuViewServer } from './ruview/mockRuViewServer';

async function main(): Promise<void> {
  const useMock = process.env.MOCK_RUVIEW === 'true';
  let cfg = loadConfig();

  if (useMock) {
    const mock = new MockRuViewServer({ httpPort: 3000, wsPort: 3001, tickMs: 200 });
    const { wsUrl, httpUrl } = await mock.start();
    cfg = { ...cfg, ruviewWsUrl: wsUrl, ruviewHttpUrl: httpUrl };
    // eslint-disable-next-line no-console
    console.log(`[gateway] MOCK RuView started at ${wsUrl}`);
    process.on('SIGINT', () => void mock.stop());
  }

  const gateway = createGateway(cfg);
  const port = await gateway.listen();
  // eslint-disable-next-line no-console
  console.log(`[gateway] listening on :${port}  (RuView ${cfg.ruviewWsUrl})`);
  if (!useMock) {
    // eslint-disable-next-line no-console
    console.log('[gateway] set MOCK_RUVIEW=true to run without RuView/hardware');
  }

  process.on('SIGINT', () => {
    void gateway.close().then(() => process.exit(0));
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[gateway] fatal', err);
  process.exit(1);
});
