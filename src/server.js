import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

/* ---------- CORS (flermultipla origins + preflight) ---------- */
/*
  ALLOWED_ORIGINS = kommaseparerad lista, t.ex.:
  https://virtualboard-frontend.onrender.com,https://websocket-client-773f.onrender.com,http://localhost:5173
*/
const RAW = process.env.ALLOWED_ORIGINS?.trim() || "*";
const ORIGINS = RAW === "*"
  ? ["*"]
  : RAW.split(",").map(s => s.trim().replace(/\/$/, "")).filter(Boolean);

app.use((req, res, next) => {
  const reqOrigin = (req.headers.origin || "").replace(/\/$/, "");

  // Välj vilket origin som ska speglas tillbaka
  let allowOrigin = "*";
  if (!(ORIGINS.length === 1 && ORIGINS[0] === "*")) {
    if (reqOrigin && ORIGINS.includes(reqOrigin)) {
      allowOrigin = reqOrigin; // spegla exakt match
    } else {
      allowOrigin = ORIGINS[0]; // fallback: första i listan (för curl/Postman utan Origin)
    }
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // res.setHeader("Access-Control-Allow-Credentials", "true"); // behövs ej nu

  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // preflight OK
  }
  next();
});

app.use(express.json());

/* ---- Health ---- */
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---- API ----
   Viktigt: mounta på ROOT så endpoints blir:
   POST /register, POST /login, GET /boards, POST /refresh, DELETE /refresh
*/
app.use("/", authRoutes);

/* ---- 404 ---- */
app.use((req, res) => res.status(404).json({ error: "not found" }));

/* ---- Felhanterare ---- */
app.use((err, _req, res, _next) => {
  if (err?.code === "P2002") return res.status(409).json({ error: "duplicate key" });
  console.error("Auth API error:", err);
  res.status(500).json({ error: "internal server error" });
});

/* ---- Start ---- */
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Auth API listening on ${PORT}`);
  console.log("Allowed origins:", ORIGINS.join(", "));
});