import { io, type Socket } from 'socket.io-client';
import type { GameState } from './gameState';

export type MultiplayerRole = 'host' | 'guest';

export interface MultiplayerRoomState {
  code: string;
  player: 'P1' | 'P2';
  version: number;
  state: GameState | null;
}

export interface MultiplayerRoomSnapshot {
  code: string;
  phase: 'lobby' | 'rps' | 'match' | 'match-paused';
  hostExpiryAt: number | null;
  settings: {
    sessionMode: 'single-game' | 'multi-game';
  };
  ready: { P1: boolean; P2: boolean };
  colors: { P1: string; P2: string };
  rps: {
    active: boolean;
    hasP1Choice: boolean;
    hasP2Choice: boolean;
    lastResult: string | null;
    lastTieChoices?: {
      P1: 'rock' | 'paper' | 'scissors' | null;
      P2: 'rock' | 'paper' | 'scissors' | null;
    };
    firstPlayer: 'P1' | 'P2' | null;
  };
  players: {
    P1: { connected: boolean };
    P2: { connected: boolean };
  };
  state: GameState | null;
  version: number;
}

export interface MultiplayerSyncResult {
  ok: boolean;
  conflict?: boolean;
  error?: string;
  version?: number;
  room?: MultiplayerRoomSnapshot;
}

export interface MultiplayerClient {
  socket: Socket;
  createRoom: () => Promise<{ roomCode: string; player: 'P1' }>;
  joinRoom: (roomCode: string, preferredSeat?: 'P1' | 'P2') => Promise<MultiplayerRoomState & { room: MultiplayerRoomSnapshot }>; 
  syncState: (roomCode: string, state: GameState, baseVersion: number) => Promise<MultiplayerSyncResult>;
  requestState: (roomCode: string, preferredSeat?: 'P1' | 'P2') => Promise<MultiplayerRoomSnapshot | null>;
  updateSessionMode: (roomCode: string, sessionMode: 'single-game' | 'multi-game') => Promise<void>;
  updateColor: (roomCode: string, color: string) => Promise<void>;
  setReady: (roomCode: string, ready: boolean) => Promise<void>;
  submitRpsChoice: (roomCode: string, choice: 'rock' | 'paper' | 'scissors') => Promise<void>;
  inspectCurtains: (roomCode: string, cardInstanceId: string) => Promise<{ ownHand: PowerCardInstance[]; opponentHand: PowerCardInstance[] }>;
  redoRps: (roomCode: string) => Promise<void>;
  backFromRps: (roomCode: string) => Promise<void>;
  disconnect: () => void;
}

const RENDER_MULTIPLAYER_SERVER_URL = 'https://roundtable-rumble-multiplayer.onrender.com';

function getServerUrl(): string {
  const globalWindow = window as Window & { __MULTIPLAYER_SERVER_URL__?: string };
  if (globalWindow.__MULTIPLAYER_SERVER_URL__) {
    return globalWindow.__MULTIPLAYER_SERVER_URL__;
  }

  if (import.meta.env.VITE_MULTIPLAYER_SERVER_URL) {
    return import.meta.env.VITE_MULTIPLAYER_SERVER_URL;
  }

  if (window.location.hostname.endsWith('github.io')) {
    return RENDER_MULTIPLAYER_SERVER_URL;
  }

  return 'http://localhost:3001';
}

function withTimeout<T>(promiseFactory: () => Promise<T>, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Could not reach multiplayer server. Please try again.'));
    }, timeoutMs);

    promiseFactory()
      .then(result => {
        window.clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export function createMultiplayerClient(): MultiplayerClient {
  const socket = io(getServerUrl(), {
    autoConnect: true,
  });

  return {
    socket,
    createRoom: () => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('room:create', (response: { roomCode?: string; player?: 'P1'; error?: string }) => {
        if (!response?.roomCode) {
          reject(new Error(response?.error || 'Could not create room.'));
          return;
        }
        resolve({ roomCode: response.roomCode, player: 'P1' });
      });
    })),
    joinRoom: (roomCode: string, preferredSeat?: 'P1' | 'P2') => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('room:join', { roomCode, preferredSeat }, (response: { ok?: boolean; error?: string; roomCode?: string; player?: 'P1' | 'P2'; state?: GameState | null; version?: number; room?: MultiplayerRoomSnapshot }) => {
        if (!response?.ok || !response.roomCode || !response.player) {
          reject(new Error(response?.error || 'Could not join room.'));
          return;
        }
        resolve({ code: response.roomCode, player: response.player, version: response.version ?? 0, state: response.state ?? null, room: response.room as MultiplayerRoomSnapshot });
      });
    })),
    syncState: (roomCode: string, state: GameState, baseVersion: number) => new Promise(resolve => {
      const timeout = window.setTimeout(() => {
        resolve({ ok: false, error: 'Sync timed out.' });
      }, 3000);

      socket.emit('room:sync', { roomCode, state, baseVersion }, (response: MultiplayerSyncResult) => {
        window.clearTimeout(timeout);
        resolve(response ?? { ok: false, error: 'No sync response.' });
      });
    }),
    requestState: (roomCode: string, preferredSeat?: 'P1' | 'P2') => withTimeout(() => new Promise(resolve => {
      socket.emit('room:request-state', { roomCode, preferredSeat }, (response: { ok?: boolean; room?: MultiplayerRoomSnapshot }) => {
        if (!response?.ok || !response.room) {
          resolve(null);
          return;
        }
        resolve(response.room);
      });
    })),
    updateSessionMode: (roomCode: string, sessionMode: 'single-game' | 'multi-game') => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('lobby:update-settings', { roomCode, sessionMode }, (response: { ok?: boolean; error?: string }) => {
        if (!response?.ok) {
          reject(new Error(response?.error || 'Could not update session mode.'));
          return;
        }
        resolve();
      });
    })),
    updateColor: (roomCode: string, color: string) => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('lobby:update-color', { roomCode, color }, (response: { ok?: boolean; error?: string }) => {
        if (!response?.ok) {
          reject(new Error(response?.error || 'Could not update color.'));
          return;
        }
        resolve();
      });
    })),
    setReady: (roomCode: string, ready: boolean) => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('lobby:set-ready', { roomCode, ready }, (response: { ok?: boolean; error?: string }) => {
        if (!response?.ok) {
          reject(new Error(response?.error || 'Could not update ready state.'));
          return;
        }
        resolve();
      });
    })),
    submitRpsChoice: (roomCode: string, choice: 'rock' | 'paper' | 'scissors') => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('lobby:rps-choice', { roomCode, choice }, (response: { ok?: boolean; error?: string }) => {
        if (!response?.ok) {
          reject(new Error(response?.error || 'Could not submit RPS choice.'));
          return;
        }
        resolve();
      });
    })),
    inspectCurtains: (roomCode: string, cardInstanceId: string) => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('match:curtains-inspect', { roomCode, cardInstanceId }, (response: { ok?: boolean; error?: string; ownHand?: PowerCardInstance[]; opponentHand?: PowerCardInstance[] }) => {
        if (!response?.ok || !response.ownHand || !response.opponentHand) {
          reject(new Error(response?.error || 'Could not inspect BEHIND THE CURTAINS hands.'));
          return;
        }
        resolve({ ownHand: response.ownHand, opponentHand: response.opponentHand });
      });
    })),
    redoRps: (roomCode: string) => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('lobby:rps-redo', { roomCode }, (response: { ok?: boolean; error?: string }) => {
        if (!response?.ok) {
          reject(new Error(response?.error || 'Could not restart RPS.'));
          return;
        }
        resolve();
      });
    })),
    backFromRps: (roomCode: string) => withTimeout(() => new Promise((resolve, reject) => {
      socket.emit('lobby:rps-back', { roomCode }, (response: { ok?: boolean; error?: string }) => {
        if (!response?.ok) {
          reject(new Error(response?.error || 'Could not return to setup.'));
          return;
        }
        resolve();
      });
    })),
    disconnect: () => {
      socket.disconnect();
    },
  };
}
