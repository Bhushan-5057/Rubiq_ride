import { Server } from "socket.io";

let ioInstance;

export const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:5173",       // Local React
    process.env.FRONTEND_URL,      // Production
  ].filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("register", ({ userId }) => {
      if (userId) {
        socket.join(userId.toString());
        console.log(`✅ User ${userId} joined their personal room`);
      }
    });

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
