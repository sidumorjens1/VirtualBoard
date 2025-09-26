
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

const RAW = process.env.FRONTEND_ORIGIN || "*";

const FRONTEND_ORIGIN = RAW.replace(/\/$/, "");

app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
    credentials: false,
  })
);


app.use(express.json());

app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

app.get("/api/boards", authRoutes);

app.use((req, res) => res.status(404).json({ error: "not found" }));

app.use((err, req, res, next) => {
  if (err?.code === "P2002") return res.status(409).json({ error: "duplicate key" });
  console.error("Auth API error:", err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Auth API listening on ${PORT}`);
  if (FRONTEND_ORIGIN !== "*") console.log(`CORS allowed origin: ${FRONTEND_ORIGIN}`);
});
