import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { seedAdmin } from "./scripts/seedAdmin.js";
import routes from "./routes/index.js";
import { initSocket } from "./config/socket/socket.js";
import paymentRoutes from "./routes/payment/payment.routes.js";
import "../src/config/firebase.js";
import './workers/rideTimeout.worker.js';

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

// Initialize socket.io
export const io = initSocket(server);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(helmet());

// Webhook needs raw body
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));

// Regular JSON body parser
app.use(express.json());

// Attach io to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/payment", paymentRoutes);
app.use("/api", routes);
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.details || undefined
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  if (dbConnection) {
    await dbConnection.close();
    console.log('MongoDB connection closed');
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

// Start server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await seedAdmin();
    console.log("Admin account verification completed successfully");
  } catch (err) {
    console.error("Admin account initialization failed:", err);
  }
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  shutdown();
});

// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);