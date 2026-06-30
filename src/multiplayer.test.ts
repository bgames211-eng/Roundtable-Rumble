import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from './gameState';
import { createMultiplayerClient, type MultiplayerRoomSnapshot } from './multiplayer';

type EmitFn = (event: string, payload?: unknown, callback?: (response: unknown) => void) => void;

const mocks = vi.hoisted(() => {
  const emit = vi.fn<EmitFn>();
  const disconnect = vi.fn();
  const io = vi.fn(() => ({ emit, disconnect }));
  return { emit, disconnect, io };
});

vi.mock('socket.io-client', () => ({
  io: mocks.io,
}));

describe('multiplayer client sync', () => {
  beforeEach(() => {
    mocks.emit.mockReset();
    mocks.disconnect.mockReset();
    mocks.io.mockClear();
    vi.useRealTimers();
  });

  it('sends baseVersion and resolves successful sync ack', async () => {
    mocks.emit.mockImplementation((event, payload, callback) => {
      if (event === 'room:sync') {
        expect(payload).toMatchObject({ roomCode: 'ABCD', baseVersion: 7 });
        callback?.({ ok: true, version: 8 });
      }
    });

    const client = createMultiplayerClient();
    const result = await client.syncState('ABCD', {} as GameState, 7);

    expect(result).toEqual({ ok: true, version: 8 });
  });

  it('passes through conflict responses with authoritative room snapshot', async () => {
    const room = {
      code: 'ABCD',
      phase: 'match',
      hostExpiryAt: null,
      settings: { sessionMode: 'single-game' },
      ready: { P1: true, P2: true },
      colors: { P1: 'red', P2: 'blue' },
      rps: {
        active: false,
        hasP1Choice: false,
        hasP2Choice: false,
        lastResult: null,
        firstPlayer: null,
      },
      players: {
        P1: { connected: true },
        P2: { connected: true },
      },
      state: null,
      version: 11,
    } as MultiplayerRoomSnapshot;

    mocks.emit.mockImplementation((event, _payload, callback) => {
      if (event === 'room:sync') {
        callback?.({ ok: false, conflict: true, version: 11, room });
      }
    });

    const client = createMultiplayerClient();
    const result = await client.syncState('ABCD', {} as GameState, 8);

    expect(result.ok).toBe(false);
    expect(result.conflict).toBe(true);
    expect(result.version).toBe(11);
    expect(result.room).toEqual(room);
  });

  it('returns timeout error when sync ack does not arrive', async () => {
    vi.useFakeTimers();
    mocks.emit.mockImplementation(() => {
      // Intentionally no callback invocation to trigger timeout handling.
    });

    const client = createMultiplayerClient();
    const pending = client.syncState('ABCD', {} as GameState, 3);

    await vi.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toEqual({ ok: false, error: 'Sync timed out.' });
  });
});