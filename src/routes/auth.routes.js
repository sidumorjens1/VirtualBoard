import express from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import { signToken } from "../utils/jwt.js";

const router = express.Router();
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

// register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(409).json({ error: "username already taken" });

    const passwordHash = await bcrypt.hash(password, ROUNDS);
    const user = await prisma.user.create({ data: { username, passwordHash } });

    // Skapar en defaultboard 
    const board = await prisma.board.create({ data: { title: `${username}` } });
    await prisma.membership.create({ data: { userId: user.id, boardId: board.id } });

    return res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// login 
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password are required" });

    const user = await prisma.user.findUnique({ where: { username }, include: { memberships: true } });
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const boardIds = user.memberships.map(m => m.boardId);
    const token = signToken({ userId: user.id, username: user.username, boardIds });

    return res.json({ token, user: { id: user.id, username: user.username }, boardIds });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal server error" });
  }
});

export default router;
