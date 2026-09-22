import { MockRuViewClient } from '../src/sensing/MockRuViewClient';
import { AppEvent, RoomState } from '../src/sensing/types';

describe('MockRuViewClient', () => {
  it('emits room state and a person_detected event on connect', async () => {
    const client = new MockRuViewClient();
    const rooms: RoomState[][] = [];
    const events: AppEvent[] = [];
    client.subscribePresence((r) => rooms.push(r));
    client.subscribeEvents((e) => events.push(e));

    await client.connect();
    await new Promise((r) => setTimeout(r, 50));
    client.disconnect();

    expect(rooms.length).toBeGreaterThan(0);
    const living = rooms[0].find((r) => r.roomId === 'living_room');
    expect(living).toBeDefined();
    expect(living!.occupied).toBe(true);
    expect(events.some((e) => e.type === 'person_detected')).toBe(true);
  });

  it('falls back to a marker (no pose) by default, matching RuView on-device stub', async () => {
    const client = new MockRuViewClient(); // withPose=false
    const rooms = await client.getRooms();
    const living = rooms.find((r) => r.roomId === 'living_room')!;
    if (living.people.length) {
      expect(living.people[0].pose).toBeUndefined();
    }
  });

  it('renders a skeleton only when pose is explicitly enabled', async () => {
    const client = new MockRuViewClient(true); // withPose=true
    // sample until the simulated person is present
    let hasPose = false;
    for (let i = 0; i < 40 && !hasPose; i += 1) {
      const rooms = await client.getRooms();
      const living = rooms.find((r) => r.roomId === 'living_room')!;
      hasPose = living.people.some((p) => Boolean(p.pose));
      // advance simulated time
      // @ts-expect-error access private tick counter for deterministic sampling
      client.t += 3;
    }
    expect(hasPose).toBe(true);
  });

  it('supports room CRUD and settings updates', async () => {
    const client = new MockRuViewClient();
    const created = await client.createRoom({ name: 'Office', nodeIds: [12] });
    expect(created.name).toBe('Office');
    const settings = await client.updateSettings({ vitalsEnabled: true });
    expect(settings.vitalsEnabled).toBe(true);
  });

  it('clears event history', async () => {
    const client = new MockRuViewClient();
    await client.connect();
    await new Promise((r) => setTimeout(r, 30));
    client.disconnect();
    const cleared = await client.clearEvents();
    expect(cleared).toBeGreaterThanOrEqual(0);
    expect(await client.getEvents()).toHaveLength(0);
  });
});
