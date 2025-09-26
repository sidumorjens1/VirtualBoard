// src/server.js (Auth API – robust CORS)
import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

/* ---------- CORS: robust och enkel ---------- */
// OBS: Lägg INTE citattecken runt värdet i Render.
// Skriv t.ex.  FRONTEND_ORIGIN = https://virtualboard-frontend.onrender.com
const RAW = process.env.FRONTEND_ORIGIN || "*";
// Ta bort ev. trailing slash
const ALLOW = RAW.replace(/\/$/, "");

// Sätt CORS-headrar på ALLA requests (även GET/POST)
app.use((req, res, next) => {
  const reqOrigin = (req.headers.origin || "").replace(/\/$/, "");
  const allowOrigin = ALLOW === "*" ? (reqOrigin || "*") : ALLOW;

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Vary", "Origin"); // för cache-korrekthet
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // res.setHeader("Access-Control-Allow-Credentials", "true"); // behövs ej nu

  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // besvara preflight direkt
  }
  next();
});

app.use(express.json());

/* ---- Health ---- */
app.get("/health", (req, res) => res.json({ ok: true }));

/* ---- API ---- */
app.use("/api/auth", authRoutes);

/* ---- 404 ---- */
app.use((req, res) => res.status(404).json({ error: "not found" }));

/* ---- Felhanterare ---- */
app.use((err, req, res, next) => {
  if (err?.code === "P2002") return res.status(409).json({ error: "duplicate key" });
  console.error("Auth API error:", err);
  res.status(500).json({ error: "internal server error" });
});

/* ---- Start ---- */
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Auth API listening on ${PORT}`);
  console.log(`CORS allowed origin: ${ALLOW}`);
});
