import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import rateLimit from "express-rate-limit";
import simpleAuthRoutes from "./routes/simpleAuthRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import counselorRoutes from "./routes/counselorRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import revenueRoutes from "./routes/revenueRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(compression());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/admin/health", (req, res) => {
  res.json({ success: true, message: "Admin API is running" });
});

app.use("/api/admin/auth/login", loginLimiter);
app.use("/api/admin/auth", simpleAuthRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/admin/counselors", counselorRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/revenue", revenueRoutes);
app.use("/api/admin/payouts", payoutRoutes);
app.use("/api/admin/location", locationRoutes);
app.use("/api/admin/settings", settingsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

export default app;
