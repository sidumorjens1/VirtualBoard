import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import boardsRoutes from "./routes/boards.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardsRoutes);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Auth API listening on port ${PORT}`));
