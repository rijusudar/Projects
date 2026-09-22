import path from 'node:path';
import { RoomConfig, RoomConfigInput } from '@wifi-presence/shared';
import { readJson, writeJson } from './jsonFile';

const ROOM_ID = () => `room_${Math.random().toString(36).slice(2, 9)}`;

/** Room definitions + the node_id → roomId mapping that RuView itself does not provide. */
export class RoomConfigStore {
  private rooms: RoomConfig[];
  private readonly file: string;

  constructor(dataDir: string, seed?: RoomConfig[]) {
    this.file = path.join(dataDir, 'rooms.json');
    this.rooms = seed ?? readJson<RoomConfig[]>(this.file, defaultRooms());
    if (!seed) this.persist();
  }

  list(): RoomConfig[] {
    return [...this.rooms];
  }

  get(roomId: string): RoomConfig | undefined {
    return this.rooms.find((r) => r.roomId === roomId);
  }

  /** node_id → roomId lookup (numbers as they arrive from RuView). */
  roomForNode(nodeId: number): string | undefined {
    return this.rooms.find((r) => r.nodeIds.includes(nodeId))?.roomId;
  }

  create(input: RoomConfigInput): RoomConfig {
    const now = Date.now();
    const room: RoomConfig = { ...input, roomId: ROOM_ID(), createdAt: now, updatedAt: now };
    this.rooms.push(room);
    this.persist();
    return room;
  }

  update(roomId: string, patch: Partial<RoomConfigInput>): RoomConfig | undefined {
    const room = this.get(roomId);
    if (!room) return undefined;
    Object.assign(room, patch, { updatedAt: Date.now() });
    this.persist();
    return room;
  }

  remove(roomId: string): boolean {
    const before = this.rooms.length;
    this.rooms = this.rooms.filter((r) => r.roomId !== roomId);
    const removed = this.rooms.length !== before;
    if (removed) this.persist();
    return removed;
  }

  private persist(): void {
    writeJson(this.file, this.rooms);
  }
}

function defaultRooms(): RoomConfig[] {
  const now = Date.now();
  return [
    { roomId: 'living_room', name: 'Living Room', nodeIds: [9], createdAt: now, updatedAt: now },
    { roomId: 'bedroom', name: 'Bedroom', nodeIds: [10], createdAt: now, updatedAt: now },
    { roomId: 'kitchen', name: 'Kitchen', nodeIds: [11], createdAt: now, updatedAt: now },
  ];
}
