import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import labelRouter from "./routes/label.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/label", labelRouter);

app.use((err, _req, res, _next) => {
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({
      ok: false,
      error: "This website is not allowed to call the API.",
      step: "parse",
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    ok: false,
    error: "Unexpected server error.",
    step: "parse",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
