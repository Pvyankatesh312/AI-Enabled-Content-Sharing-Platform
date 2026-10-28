const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const env = require("./config/env");
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const adminRoutes = require("./routes/admin");
const aiRoutes = require("./routes/ai");
const mediaRoutes = require("./routes/media");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin === "*" ? true : env.clientOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(
  "/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use(
  "/ai",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/health", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        status: "unavailable",
        database: "disconnected",
      });
    }

    await mongoose.connection.db.admin().ping();
    return res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database ping failed", error);
    return res.status(503).json({
      status: "unavailable",
      database: "disconnected",
    });
  }
});
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/admin", adminRoutes);
app.use("/ai", aiRoutes);
app.use("/media", mediaRoutes);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

module.exports = app;
