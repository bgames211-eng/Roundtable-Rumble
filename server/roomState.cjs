const rooms = new Map();
const hostExpiryTimers = new Map();
const HOST_DISCONNECT_TTL_MS = 10 * 60 * 1000;

function createRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 5; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function normalizeRoomCode(value) {
  return String(value || '').trim().toUpperCase();
}

function createEmptyRoom(hostSocketId) {
  return {
    code: createRoomCode(),
    hostSocketId,
    phase: 'lobby',
    hostExpiryAt: null,
    settings: {
      sessionMode: 'single-game',
    },
    ready: {
      P1: false,
      P2: false,
    },
    colors: {
      P1: 'Blue',
      P2: 'Red',
    },
    rps: {
      active: false,
      choices: {
        P1: null,
        P2: null,
      },
      lastResult: null,
      lastTieChoices: {
        P1: null,
        P2: null,
      },
      firstPlayer: null,
    },
    players: {
      P1: {
        socketId: hostSocketId,
        connected: true,
      },
      P2: {
        socketId: null,
        connected: false,
      },
    },
    state: null,
    version: 0,
  };
}

function getRoom(code) {
  return rooms.get(normalizeRoomCode(code)) || null;
}

function ensureRoom(hostSocketId) {
  const room = createEmptyRoom(hostSocketId);
  rooms.set(room.code, room);
  return room;
}

function cancelHostExpiry(code) {
  const timer = hostExpiryTimers.get(code);
  if (timer) {
    clearTimeout(timer);
    hostExpiryTimers.delete(code);
  }
  const room = rooms.get(code);
  if (room) {
    room.hostExpiryAt = null;
  }
}

function scheduleHostExpiry(code, onExpire) {
  cancelHostExpiry(code);
  const room = rooms.get(code);
  if (!room) {
    return;
  }

  room.hostExpiryAt = Date.now() + HOST_DISCONNECT_TTL_MS;
  const timer = setTimeout(() => {
    hostExpiryTimers.delete(code);
    onExpire(code);
  }, HOST_DISCONNECT_TTL_MS);
  hostExpiryTimers.set(code, timer);
}

function assignSeat(room, preferredSeat, socketId) {
  if (preferredSeat && room.players[preferredSeat] && !room.players[preferredSeat].connected) {
    room.players[preferredSeat].socketId = socketId;
    room.players[preferredSeat].connected = true;
    if (preferredSeat === 'P1') {
      room.hostSocketId = socketId;
      cancelHostExpiry(room.code);
    }
    return preferredSeat;
  }

  if (!room.players.P1.connected) {
    room.players.P1.socketId = socketId;
    room.players.P1.connected = true;
    room.hostSocketId = socketId;
    cancelHostExpiry(room.code);
    return 'P1';
  }

  if (!room.players.P2.connected) {
    room.players.P2.socketId = socketId;
    room.players.P2.connected = true;
    return 'P2';
  }

  return null;
}

function joinRoom(code, socketId, preferredSeat = null) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  const seat = assignSeat(room, preferredSeat, socketId);
  if (!seat) {
    return null;
  }

  return { room, seat };
}

function resetRps(room) {
  room.rps.active = false;
  room.rps.choices.P1 = null;
  room.rps.choices.P2 = null;
  room.rps.lastResult = null;
  room.rps.lastTieChoices.P1 = null;
  room.rps.lastTieChoices.P2 = null;
  room.rps.firstPlayer = null;
}

function restartRps(room) {
  room.phase = 'rps';
  room.rps.active = true;
  room.rps.choices.P1 = null;
  room.rps.choices.P2 = null;
  room.rps.lastResult = null;
  room.rps.lastTieChoices.P1 = null;
  room.rps.lastTieChoices.P2 = null;
  room.rps.firstPlayer = null;
  return room;
}

function backToLobbyFromRps(room) {
  resetRps(room);
  room.phase = 'lobby';
  room.ready.P1 = false;
  room.ready.P2 = false;
  return room;
}

function removeSocket(socketId, onHostExpiry) {
  for (const [code, room] of rooms.entries()) {
    if (room.hostSocketId === socketId) {
      room.players.P1.connected = false;
      room.players.P1.socketId = null;
      room.ready.P1 = false;
      scheduleHostExpiry(code, onHostExpiry);
    }

    if (room.players.P1.socketId === socketId) {
      room.players.P1.connected = false;
      room.players.P1.socketId = null;
      room.ready.P1 = false;
    }
    if (room.players.P2.socketId === socketId) {
      room.players.P2.connected = false;
      room.players.P2.socketId = null;
      room.ready.P2 = false;
      resetRps(room);
      room.phase = room.state ? 'match-paused' : 'lobby';
    }

    if (!room.players.P1.connected && !room.players.P2.connected && !room.state) {
      cancelHostExpiry(code);
      rooms.delete(code);
    }
  }
}

function updateRoomSettings(code, updates) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  room.settings = { ...room.settings, ...updates };
  room.ready.P1 = false;
  room.ready.P2 = false;
  return room;
}

function updatePlayerColor(code, seat, color) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  room.colors[seat] = color;
  return room;
}

function setPlayerReady(code, seat, ready) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  room.ready[seat] = !!ready;
  return room;
}

function startRpsIfReady(code) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  if (!room.players.P1.connected || !room.players.P2.connected) {
    return room;
  }

  if (!room.ready.P1 || !room.ready.P2) {
    return room;
  }

  room.phase = 'rps';
  room.rps.active = true;
  room.rps.choices.P1 = null;
  room.rps.choices.P2 = null;
  room.rps.lastResult = null;
  return room;
}

function submitRpsChoice(code, seat, choice) {
  const room = getRoom(code);
  if (!room || !room.rps.active) {
    return null;
  }

  room.rps.choices[seat] = choice;

  const c1 = room.rps.choices.P1;
  const c2 = room.rps.choices.P2;
  if (!c1 || !c2) {
    return { room, resolved: false };
  }

  if (c1 === c2) {
    room.rps.lastResult = 'tie';
    room.rps.lastTieChoices.P1 = c1;
    room.rps.lastTieChoices.P2 = c2;
    room.rps.choices.P1 = null;
    room.rps.choices.P2 = null;
    return { room, resolved: true, tie: true, p1Choice: c1, p2Choice: c2 };
  }

  const p1Wins = (c1 === 'rock' && c2 === 'scissors')
    || (c1 === 'paper' && c2 === 'rock')
    || (c1 === 'scissors' && c2 === 'paper');
  const firstPlayer = p1Wins ? 'P1' : 'P2';

  room.rps.active = false;
  room.rps.firstPlayer = firstPlayer;
  room.rps.lastResult = `${c1}-${c2}`;
  room.phase = 'match';

  return { room, resolved: true, tie: false, firstPlayer };
}

function saveRoomState(code, state, actorSeat = null) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  let nextState = state
    ? {
        ...state,
        publicPowerCardHandCount: undefined,
      }
    : state;
  if (
    actorSeat
    && room.state
    && nextState
    && room.state.powerCardHands
    && nextState.powerCardHands
  ) {
    const opponentSeat = actorSeat === 'P1' ? 'P2' : 'P1';
    nextState = {
      ...nextState,
      powerCardHands: {
        ...nextState.powerCardHands,
        [opponentSeat]: room.state.powerCardHands[opponentSeat],
      },
    };
  }

  room.state = nextState;
  if (room.phase !== 'match-paused') {
    room.phase = 'match';
  }
  room.version += 1;
  return room;
}

function inspectCurtainsHands(code, seat, cardInstanceId) {
  const room = getRoom(code);
  if (!room || !room.state || !seat) {
    return null;
  }

  const ownSeat = seat === 'P2' ? 'P2' : 'P1';
  const opponentSeat = ownSeat === 'P1' ? 'P2' : 'P1';
  const ownHand = room.state.powerCardHands?.[ownSeat] || [];
  const opponentHand = room.state.powerCardHands?.[opponentSeat] || [];
  const curtainsCard = ownHand.find(card => card.instanceId === cardInstanceId);
  if (!curtainsCard || curtainsCard.definitionId !== 'power-alpha-019') {
    return null;
  }

  return {
    ownHand: ownHand.filter(card => card.instanceId !== cardInstanceId),
    opponentHand: [...opponentHand],
  };
}

function closeRoom(code) {
  cancelHostExpiry(code);
  return rooms.delete(code);
}

function toPublicRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    hostExpiryAt: room.hostExpiryAt,
    settings: room.settings,
    ready: room.ready,
    colors: room.colors,
    rps: {
      active: room.rps.active,
      hasP1Choice: !!room.rps.choices.P1,
      hasP2Choice: !!room.rps.choices.P2,
      lastResult: room.rps.lastResult,
      lastTieChoices: {
        P1: room.rps.lastTieChoices.P1,
        P2: room.rps.lastTieChoices.P2,
      },
      firstPlayer: room.rps.firstPlayer,
    },
    players: {
      P1: { connected: room.players.P1.connected },
      P2: { connected: room.players.P2.connected },
    },
    state: room.state,
    version: room.version,
  };
}

function redactStateForSeat(state, seat) {
  if (!state || !seat) {
    return state;
  }

  const ownSeat = seat === 'P2' ? 'P2' : 'P1';
  const opponentSeat = ownSeat === 'P1' ? 'P2' : 'P1';

  return {
    ...state,
    publicPowerCardHandCount: {
      P1: state.powerCardHands.P1.length,
      P2: state.powerCardHands.P2.length,
    },
    powerCardHands: {
      ...state.powerCardHands,
      [opponentSeat]: [],
    },
  };
}

function toScopedRoom(room, seat) {
  const scoped = toPublicRoom(room);
  return {
    ...scoped,
    state: redactStateForSeat(scoped.state, seat),
  };
}

module.exports = {
  HOST_DISCONNECT_TTL_MS,
  closeRoom,
  ensureRoom,
  getRoom,
  joinRoom,
  normalizeRoomCode,
  removeSocket,
  saveRoomState,
  inspectCurtainsHands,
  backToLobbyFromRps,
  setPlayerReady,
  restartRps,
  startRpsIfReady,
  submitRpsChoice,
  toScopedRoom,
  toPublicRoom,
  updatePlayerColor,
  updateRoomSettings,
};