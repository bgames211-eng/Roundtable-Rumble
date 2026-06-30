const http = require('http');
const { Server } = require('socket.io');
const {
  ensureRoom,
  getRoom,
  joinRoom,
  normalizeRoomCode,
  removeSocket,
  saveRoomState,
} = require('./roomState.cjs');

const PORT = process.env.PORT || 3001;

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
  socket.on('room:create', callback => {
    const room = ensureRoom(socket.id);
    room.players.P1 = socket.id;
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.player = 'P1';
    callback?.({ roomCode: room.code, player: 'P1' });
    io.to(room.code).emit('room:update', room);
  });

  socket.on('room:join', ({ roomCode }, callback) => {
    const normalized = normalizeRoomCode(roomCode);
    const room = joinRoom(normalized, socket.id);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found.' });
      return;
    }

    const player = room.players.P1 === socket.id ? 'P1' : 'P2';
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.player = player;
    callback?.({ ok: true, roomCode: room.code, player, state: room.state, version: room.version });
    io.to(room.code).emit('room:update', room);
  });

  socket.on('room:sync', ({ roomCode, state }) => {
    const normalized = normalizeRoomCode(roomCode);
    const room = saveRoomState(normalized, state);
    if (!room) {
      return;
    }
    io.to(room.code).emit('room:update', room);
  });

  socket.on('room:request-state', ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    callback?.(room ? { ok: true, room } : { ok: false, error: 'Room not found.' });
  });

  socket.on('disconnect', () => {
    removeSocket(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Roundtable Rumble multiplayer server listening on ${PORT}`);
});