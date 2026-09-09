import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import kitRoutes from "./src/routes/kit.routes.js";
import retrievalRoutes from "./src/routes/retrieval.routes.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 4000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:3000";

// =========================
// Middleware
// =========================

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(cookieParser());

// =========================
// Health Check
// =========================

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Interview Prep Kit API is running",
  });
});

// =========================
// API Routes
// =========================

app.use("/api/auth", authRoutes);

app.use("/api/kits", kitRoutes);

app.use("/api/retrieval", retrievalRoutes);

// =========================
// 404 Handler
// =========================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =========================
// Global Error Handler
// =========================

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("Unhandled error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

// =========================
// Start Server
// =========================

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Backend running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();