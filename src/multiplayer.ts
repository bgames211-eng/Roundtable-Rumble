import { io, type Socket } from 'socket.io-client';
import type { GameState } from './gameState';

export type MultiplayerRole = 'host' | 'guest';

export interface MultiplayerRoomState {
  code: string;
  player: 'P1' | 'P2';
  version: number;
  state: GameState | null;
}

export interface MultiplayerClient {
  socket: Socket;
  createRoom: () => Promise<{ roomCode: string; player: 'P1' }>;
  joinRoom: (roomCode: string) => Promise<MultiplayerRoomState>;
  syncState: (roomCode: string, state: GameState) => void;
  requestState: (roomCode: string) => Promise<MultiplayerRoomState | null>;
  disconnect: () => void;
}

function getServerUrl(): string {
  const globalWindow = window as Window & { __MULTIPLAYER_SERVER_URL__?: string };
  if (globalWindow.__MULTIPLAYER_SERVER_URL__) {
    return globalWindow.__MULTIPLAYER_SERVER_URL__;
  }

  if (import.meta.env.VITE_MULTIPLAYER_SERVER_URL) {
    return import.meta.env.VITE_MULTIPLAYER_SERVER_URL;
  }

  return 'http://localhost:3001';
}

export function createMultiplayerClient(): MultiplayerClient {
  const socket = io(getServerUrl(), {
    autoConnect: true,
    transports: ['websocket'],
  });

  return {
    socket,
    createRoom: () => new Promise((resolve, reject) => {
      socket.emit('room:create', (response: { roomCode?: string; player?: 'P1'; error?: string }) => {
        if (!response?.roomCode) {
          reject(new Error(response?.error || 'Could not create room.'));
          return;
        }
        resolve({ roomCode: response.roomCode, player: 'P1' });
      });
    }),
    joinRoom: (roomCode: string) => new Promise((resolve, reject) => {
      socket.emit('room:join', { roomCode }, (response: { ok?: boolean; error?: string; roomCode?: string; player?: 'P1' | 'P2'; state?: GameState | null; version?: number }) => {
        if (!response?.ok || !response.roomCode || !response.player) {
          reject(new Error(response?.error || 'Could not join room.'));
          return;
        }
        resolve({ code: response.roomCode, player: response.player, version: response.version ?? 0, state: response.state ?? null });
      });
    }),
    syncState: (roomCode: string, state: GameState) => {
      socket.emit('room:sync', { roomCode, state });
    },
    requestState: (roomCode: string) => new Promise(resolve => {
      socket.emit('room:request-state', { roomCode }, (response: { ok?: boolean; room?: { code: string; version: number; state: GameState | null } }) => {
        if (!response?.ok || !response.room) {
          resolve(null);
          return;
        }
        resolve({ code: response.room.code, player: 'P1', version: response.room.version, state: response.room.state });
      });
    }),
    disconnect: () => {
      socket.disconnect();
    },
  };
}
