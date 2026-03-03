import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import { validateGeminiConfig } from "./utils/gemini.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import interviewRoutes from "./routes/interview.routes.js";
import projectRoutes from "./routes/project.routes.js";
import testRoutes from "./routes/testRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

/* ─────────────────────────────────────────────
   Startup checks
───────────────────────────────────────────── */

validateGeminiConfig();
await connectDB();

/* ─────────────────────────────────────────────
   Security
───────────────────────────────────────────── */

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ─────────────────────────────────────────────
   Parsing
───────────────────────────────────────────── */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")
);

/* ─────────────────────────────────────────────
   Health Check
───────────────────────────────────────────── */

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "AI Interviewer Backend",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

/* ─────────────────────────────────────────────
   API Routes
───────────────────────────────────────────── */

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/projects", projectRoutes);
app.use("/", testRoutes);

/* ─────────────────────────────────────────────
   404 Handler
───────────────────────────────────────────── */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `${req.method} ${req.originalUrl} not found`,
  });
});



/* ─────────────────────────────────────────────
   Global Error Handler
───────────────────────────────────────────── */

app.use(errorHandler);

/* ─────────────────────────────────────────────
   Start Server
───────────────────────────────────────────── */

app.listen(PORT, () => {
  console.log("\n🚀 Backend running at:");
  console.log(`http://localhost:${PORT}`);

  console.log("\n🤖 Gemini Model:");
  console.log(process.env.GEMINI_MODEL || "gemini-2.0-flash");

  console.log("\n📦 MongoDB:");
  console.log(process.env.MONGODB_URI || "mongodb://localhost:27017/ai-interviewer");

  console.log(
  "\n📧 Mail Service:",
  process.env.SMTP_HOST ? "Brevo SMTP configured" : "Not configured"
);

  console.log("");
});

export default app;