
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();
const app = express();

const RAW = process.env.FRONTEND_ORIGIN || "*";
const FRONTEND_ORIGIN = RAW.replace(/\/$/, ""); // ta bort ev. trailing slash

app.use(cors({
  origin(origin, cb) {
    if (!origin || FRONTEND_ORIGIN === "*") return cb(null, true);
    const norm = origin.replace(/\/$/, "");
    if (norm === FRONTEND_ORIGIN) return cb(null, true);
    return cb(new Error("CORS not allowed"), false);
  },
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.options("*", cors());

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.get("/api/boards", authRoutes); // reuse GET /boards route

app.use((req, res) => res.status(404).json({ error: "not found" }));

app.use((err, req, res, next) => {
  if (err?.code === "P2002") return res.status(409).json({ error: "duplicate key" });
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Auth API listening on ${PORT}`);
  if (FRONTEND_ORIGIN !== "*") console.log(`CORS: ${FRONTEND_ORIGIN}`);
});
