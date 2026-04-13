import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Basic API route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io logic
  const rooms: Record<string, { players: any[], mode: string, state: any }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_matchmaking", ({ mode }) => {
      // Find an available room or create a new one
      let roomId = null;
      const maxPlayers = mode === 'VERSUS' ? 2 : 8; 

      for (const id in rooms) {
        if (rooms[id].mode === mode && rooms[id].players.length < maxPlayers) {
          roomId = id;
          break;
        }
      }

      if (!roomId) {
        roomId = `room_${Math.random().toString(36).substring(2, 9)}`;
        rooms[roomId] = { players: [], mode, state: {} };
      }

      rooms[roomId].players.push({ id: socket.id, ready: false, x: 7, y: 7 });
      socket.join(roomId);
      
      console.log(`User ${socket.id} joined room ${roomId} (${mode})`);

      // Notify everyone in the room about the updated player list
      io.to(roomId).emit("room_update", {
        roomId,
        players: rooms[roomId].players,
        maxPlayers
      });
    });

    socket.on("start_game", ({ roomId }) => {
      console.log(`Starting game for room: ${roomId || 'unknown'}`);
      
      // If roomId is not provided, try to find the room the socket is in
      let targetRoomId = roomId;
      if (!targetRoomId) {
        for (const id in rooms) {
          if (rooms[id].players.some(p => p.id === socket.id)) {
            targetRoomId = id;
            break;
          }
        }
      }

      if (targetRoomId && rooms[targetRoomId]) {
        console.log(`Emitting game_start to room: ${targetRoomId}`);
        io.to(targetRoomId).emit("game_start", { 
          roomId: targetRoomId, 
          players: rooms[targetRoomId].players 
        });
      } else {
        console.log(`Room not found for start_game. Socket: ${socket.id}`);
      }
    });

    socket.on("battle_choice", ({ roomId, pokemonName, pokemonData }) => {
      if (rooms[roomId]) {
        const player = rooms[roomId].players.find(p => p.id === socket.id);
        if (player) {
          player.pokemon = { name: pokemonName, data: pokemonData };
          player.ready = true;
        }

        // Check if everyone is ready
        if (rooms[roomId].players.every(p => p.ready)) {
          io.to(roomId).emit("battle_start_pvp", { 
            players: rooms[roomId].players 
          });
          // Reset ready for actions
          rooms[roomId].players.forEach(p => p.ready = false);
        } else {
          io.to(roomId).emit("room_update", {
            roomId,
            players: rooms[roomId].players,
            maxPlayers: 8
          });
        }
      }
    });

    socket.on("battle_action", ({ roomId, action }) => {
      if (rooms[roomId]) {
        const player = rooms[roomId].players.find(p => p.id === socket.id);
        if (player) {
          player.action = action;
          player.ready = true;
        }

        if (rooms[roomId].players.every(p => p.ready)) {
          const actions = rooms[roomId].players.map(p => ({ 
            id: p.id, 
            action: p.action,
            pokemon: p.pokemon
          }));
          io.to(roomId).emit("battle_turn_ready", { actions });
          rooms[roomId].players.forEach(p => {
            p.ready = false;
            p.action = null;
          });
        }
      }
    });

    socket.on("battle_result_sync", ({ roomId, result }) => {
      if (rooms[roomId]) {
        socket.to(roomId).emit("battle_result_update", result);
      }
    });

    socket.on("player_move", ({ roomId, x, y }) => {
      if (rooms[roomId]) {
        const player = rooms[roomId].players.find(p => p.id === socket.id);
        if (player) {
          player.x = x;
          player.y = y;
        }
        socket.to(roomId).emit("player_moved", { id: socket.id, x, y });
      }
    });

    socket.on("leave_room", ({ roomId }) => {
      if (rooms[roomId]) {
        rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
        socket.leave(roomId);
        io.to(roomId).emit("room_update", {
          roomId,
          players: rooms[roomId].players,
          maxPlayers: 8
        });
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Remove user from any rooms
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          io.to(roomId).emit("room_update", {
            roomId,
            players: room.players,
            maxPlayers: 8
          });
          // Also notify others to remove this player's avatar
          io.to(roomId).emit("player_disconnected", { id: socket.id });
          if (room.players.length === 0) {
            delete rooms[roomId];
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
