import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import labelRouter from "./routes/label.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
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

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
