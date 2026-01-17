console.log("CWD:", process.cwd());
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import routes from "./routes/index.js";
import { initSocket } from "./config/socket/socket.js";
import paymentRoutes from "./routes/payment/payment.routes.js";
import "./config/firebase.js";
// import './workers/rideTimeout.worker.js';
import { mongoose } from "./config/dbConnect.js";
import { connectDB } from "./config/dbConnect.js";
import config from "./helpers/systemConfig.helper.js"
import { initCloudinary } from "./config/cloudinary.config.js";
import { initRedis } from "./config/redis.js";

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
  console.log("Shutting down server...");

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    }
  } catch (err) {
    console.error("Error closing MongoDB:", err);
  }

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
};

// Start server
(async () => {
  await connectDB();
  await config.load();
  initRedis();
  initCloudinary();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  shutdown();
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown()
});


// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);