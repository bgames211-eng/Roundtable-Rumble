const http = require('http');
const { Server } = require('socket.io');
const {
  backToLobbyFromRps,
  closeRoom,
  ensureRoom,
  getRoom,
  HOST_DISCONNECT_TTL_MS,
  joinRoom,
  normalizeRoomCode,
  removeSocket,
  saveRoomState,
  inspectCurtainsHands,
  restartRps,
  setPlayerReady,
  startRpsIfReady,
  submitRpsChoice,
  toScopedRoom,
  toPublicRoom,
  updatePlayerColor,
  updateRoomSettings,
} = require('./roomState.cjs');

const PORT = process.env.PORT || 3001;
const RPS_TIE_RESET_DELAY_MS = 3000;
const rpsTieResetTimers = new Map();

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Roundtable Rumble multiplayer server is running.');
});

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

io.on('connection', socket => {
  const clearRpsTieResetTimer = roomCode => {
    const timer = rpsTieResetTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      rpsTieResetTimers.delete(roomCode);
    }
  };

  const emitRoomUpdate = room => {
    if (room.players.P1.socketId) {
      io.to(room.players.P1.socketId).emit('room:update', toScopedRoom(room, 'P1'));
    }
    if (room.players.P2.socketId) {
      io.to(room.players.P2.socketId).emit('room:update', toScopedRoom(room, 'P2'));
    }
  };

  socket.on('room:create', callback => {
    const room = ensureRoom(socket.id);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.player = 'P1';
    socket.data.isHost = true;
    callback?.({ roomCode: room.code, player: 'P1' });
    emitRoomUpdate(room);
  });

  socket.on('room:join', ({ roomCode, preferredSeat }, callback) => {
    const normalized = normalizeRoomCode(roomCode);
    const joined = joinRoom(normalized, socket.id, preferredSeat ?? null);
    if (!joined) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    const { room, seat } = joined;
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.player = seat;
    socket.data.isHost = seat === 'P1';
    const scopedRoom = toScopedRoom(room, seat);
    callback?.({ ok: true, roomCode: room.code, player: seat, state: scopedRoom.state, version: room.version, room: scopedRoom });
    emitRoomUpdate(room);
  });

  socket.on('lobby:update-settings', ({ roomCode, sessionMode }, callback) => {
    if (socket.data.player !== 'P1') {
      callback?.({ ok: false, error: 'Only host can change session settings.' });
      return;
    }

    const room = updateRoomSettings(roomCode, { sessionMode });
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    emitRoomUpdate(room);
    callback?.({ ok: true });
  });

  socket.on('lobby:update-color', ({ roomCode, color }, callback) => {
    const seat = socket.data.player;
    if (!seat) {
      callback?.({ ok: false, error: 'Seat not assigned.' });
      return;
    }

    const room = updatePlayerColor(roomCode, seat, color);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    emitRoomUpdate(room);
    callback?.({ ok: true });
  });

  socket.on('lobby:set-ready', ({ roomCode, ready }, callback) => {
    const seat = socket.data.player;
    if (!seat) {
      callback?.({ ok: false, error: 'Seat not assigned.' });
      return;
    }

    const room = setPlayerReady(roomCode, seat, ready);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    startRpsIfReady(roomCode);
    emitRoomUpdate(room);
    callback?.({ ok: true });
  });

  socket.on('lobby:rps-choice', ({ roomCode, choice }, callback) => {
    const seat = socket.data.player;
    if (!seat) {
      callback?.({ ok: false, error: 'Seat not assigned.' });
      return;
    }

    const outcome = submitRpsChoice(roomCode, seat, choice);
    if (!outcome) {
      callback?.({ ok: false, error: 'RPS is not active.' });
      return;
    }

    emitRoomUpdate(outcome.room);
    if (outcome.resolved && outcome.tie) {
      clearRpsTieResetTimer(outcome.room.code);
      const timer = setTimeout(() => {
        rpsTieResetTimers.delete(outcome.room.code);
        const room = getRoom(outcome.room.code);
        if (!room || room.phase !== 'rps' || room.rps.lastResult !== 'tie') {
          return;
        }
        restartRps(room);
        emitRoomUpdate(room);
      }, RPS_TIE_RESET_DELAY_MS);
      rpsTieResetTimers.set(outcome.room.code, timer);
      io.to(outcome.room.code).emit('lobby:rps-tie', {
        p1Choice: outcome.p1Choice || null,
        p2Choice: outcome.p2Choice || null,
        sessionMode: outcome.room.settings.sessionMode,
      });
    }

    if (outcome.resolved && !outcome.tie && outcome.firstPlayer) {
      clearRpsTieResetTimer(outcome.room.code);
      const p1Choice = outcome.room.rps.choices?.P1 || null;
      const p2Choice = outcome.room.rps.choices?.P2 || null;
      io.to(outcome.room.code).emit('match:start', {
        firstPlayer: outcome.firstPlayer,
        sessionMode: outcome.room.settings.sessionMode,
        p1Choice,
        p2Choice,
      });
    }

    callback?.({ ok: true });
  });

  socket.on('lobby:rps-redo', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    if (room.rps.lastResult !== 'tie') {
      callback?.({ ok: false, error: 'RPS is not waiting for a redo.' });
      return;
    }

    clearRpsTieResetTimer(room.code);
    restartRps(room);
    emitRoomUpdate(room);
    callback?.({ ok: true });
  });

  socket.on('lobby:rps-back', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    if (room.phase !== 'rps') {
      callback?.({ ok: false, error: 'RPS is not active.' });
      return;
    }

    clearRpsTieResetTimer(room.code);
    backToLobbyFromRps(room);
    emitRoomUpdate(room);
    callback?.({ ok: true });
  });

  socket.on('match:curtains-inspect', ({ roomCode, cardInstanceId }, callback) => {
    const seat = socket.data.player;
    if (!seat) {
      callback?.({ ok: false, error: 'Seat not assigned.' });
      return;
    }

    const snapshot = inspectCurtainsHands(roomCode, seat, cardInstanceId);
    if (!snapshot) {
      callback?.({ ok: false, error: 'Could not inspect BEHIND THE CURTAINS hands.' });
      return;
    }

    callback?.({ ok: true, ownHand: snapshot.ownHand, opponentHand: snapshot.opponentHand });
  });

  socket.on('room:sync', ({ roomCode, state, baseVersion }, callback) => {
    const seat = socket.data.player;
    if (!seat) {
      callback?.({ ok: false, error: 'Seat not assigned.' });
      return;
    }

    const normalized = normalizeRoomCode(roomCode);
    const existing = getRoom(normalized);
    if (!existing || existing.phase === 'match-paused') {
      callback?.({ ok: false, error: 'Room unavailable for sync.' });
      return;
    }

    if (!existing.players[seat].connected || existing.players[seat].socketId !== socket.id) {
      callback?.({ ok: false, error: 'Socket is not active seat owner.' });
      return;
    }

    if (typeof baseVersion === 'number' && baseVersion !== existing.version) {
      callback?.({ ok: false, conflict: true, room: toScopedRoom(existing, seat), version: existing.version });
      return;
    }

    if (existing.state && state) {
      const existingGameStatus = existing.state.gameStatus;
      const incomingGameStatus = state.gameStatus;
      const existingEventCount = Array.isArray(existing.state.eventLog) ? existing.state.eventLog.length : 0;
      const incomingEventCount = Array.isArray(state.eventLog) ? state.eventLog.length : 0;

      const wouldReopenFinishedGame = existingGameStatus !== 'active' && incomingGameStatus === 'active';
      const wouldLoseEvents = incomingEventCount < existingEventCount;

      const existingSessionGameNumber = typeof existing.state.sessionGameNumber === 'number'
        ? existing.state.sessionGameNumber
        : 1;
      const incomingSessionGameNumber = typeof state.sessionGameNumber === 'number'
        ? state.sessionGameNumber
        : 1;
      const incomingLooksLikeFreshMatch = state.turnNumber === 1 && !state.pendingBattle;
      const isHostSeat = seat === 'P1';

      // Host may legitimately start a fresh match after a finished game.
      // For multi-game, this is the next session game; for single-game, this is a rematch reset.
      const allowLegitReopen = wouldReopenFinishedGame
        && isHostSeat
        && incomingLooksLikeFreshMatch
        && (
          (existing.state.sessionMode === 'multi-game'
            && state.sessionMode === 'multi-game'
            && incomingSessionGameNumber === existingSessionGameNumber + 1)
          || (state.sessionMode === 'single-game' && incomingSessionGameNumber === 1)
        );

      if ((wouldReopenFinishedGame && !allowLegitReopen) || (wouldLoseEvents && !allowLegitReopen)) {
        callback?.({ ok: false, conflict: true, room: toScopedRoom(existing, seat), version: existing.version });
        return;
      }
    }

    const room = saveRoomState(normalized, state, seat);
    if (!room) {
      callback?.({ ok: false, error: 'Could not save room state.' });
      return;
    }
    emitRoomUpdate(room);
    callback?.({ ok: true, version: room.version });
  });

  socket.on('room:request-state', ({ roomCode, preferredSeat }, callback) => {
    const room = getRoom(roomCode);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    const seat = preferredSeat === 'P2' ? 'P2' : 'P1';
    callback?.({ ok: true, room: toScopedRoom(room, seat) });
  });

  socket.on('disconnect', () => {
    removeSocket(socket.id, code => {
      const room = getRoom(code);
      if (room) {
        io.to(code).emit('room:host-expiring', { expiresInMs: HOST_DISCONNECT_TTL_MS });
      }
      setTimeout(() => {
        const current = getRoom(code);
        if (current && !current.players.P1.connected) {
          clearRpsTieResetTimer(code);
          io.to(code).emit('room:closed', { reason: 'host-disconnected-timeout' });
          closeRoom(code);
        }
      }, HOST_DISCONNECT_TTL_MS + 100);
    });

    const roomCode = socket.data.roomCode;
    if (roomCode) {
      const room = getRoom(roomCode);
      if (room) {
        emitRoomUpdate(room);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Roundtable Rumble multiplayer server listening on ${PORT}`);
});