import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";

import { connectDB } from "./config/dbConnect.js";
import { seedAdmin } from "./scripts/seedAdmin.js";
import routes from "./routes/index.js";
import { initSocket } from "./config/socket/socket.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

const server = http.createServer(app);

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
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api", routes);
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404 + error handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
  // console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.details || undefined
  });
});

// Start server
(async () => {
  try {
    await connectDB();
    server.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      try {
        await seedAdmin();
        console.log("Admin account verification completed successfully.");
      } catch (err) {
        console.error(
          "Admin account initialization failed:",
          err.message || err
        );
      }
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
