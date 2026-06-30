const rooms = new Map();

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
    players: {
      P1: null,
      P2: null,
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

function joinRoom(code, socketId) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  if (!room.players.P1) {
    room.players.P1 = socketId;
  } else if (!room.players.P2) {
    room.players.P2 = socketId;
  }

  return room;
}

function removeSocket(socketId) {
  for (const [code, room] of rooms.entries()) {
    if (room.hostSocketId === socketId) {
      rooms.delete(code);
      continue;
    }

    if (room.players.P1 === socketId) {
      room.players.P1 = null;
    }
    if (room.players.P2 === socketId) {
      room.players.P2 = null;
    }

    if (!room.players.P1 && !room.players.P2 && !room.state) {
      rooms.delete(code);
    }
  }
}

function saveRoomState(code, state) {
  const room = getRoom(code);
  if (!room) {
    return null;
  }

  room.state = state;
  room.version += 1;
  return room;
}

module.exports = {
  ensureRoom,
  getRoom,
  joinRoom,
  normalizeRoomCode,
  removeSocket,
  saveRoomState,
};