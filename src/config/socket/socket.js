import { Server } from "socket.io";
import { registerChatEvents } from "./chat.socket.js";

let ioInstance;

export const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:5173",       // Local React
    process.env.FRONTEND_URL,      // Production
  ].filter(Boolean);

  const io = new Server(server, {
    transports: ["websocket", "polling"],
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  }); 

    io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("❌ Socket connection rejected: no token");
      return next(new Error("Unauthorized"));
    }

    // 🔜 Later: verify JWT here
    // socket.user = decodedUser;

    next();
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("register", ({ userId }) => {
      if(!userId) return ;
      const room =userId.toString();
      if (!socket.rooms.has(room)) {
        socket.join(room);
         console.log("🧩 Rooms:", socket.rooms);
        console.log(`✅ User ${userId} joined their personal room`);
      }
    });

    registerChatEvents(io, socket);

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized!");
  return ioInstance;
};
