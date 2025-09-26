import express from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import { signToken } from "../utils/jwt.js";

const router = Router();
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const JWT_SECRET = process.env.JWT_SECRET;

function getUserFromAuthHeader(req, res) {
  const auth = req.headers["authorization"] || "";  
  const [type, tok] = auth.split(" ");
  if (type !== "Bearer" || !tok) {
    res.status(401).json({ error: "missing token" });
    return null;
  }
  try {
    return jwt.verify(tok, JWT_SECRET); 
  } catch {
    res.status(401).json({ error: "invalid token" });
    return null;
  }
}

router.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password)
    return res.status(400).json({ error: "username & password required" });

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ error: "username already exists" });

  const passwordHash = await bcrypt.hash(password, ROUNDS);
  const user = await prisma.user.create({ data: { username, passwordHash } });

  const board = await prisma.board.create({ data: { title: `${username}'s Board` } });
  await prisma.membership.create({ data: { userId: user.id, boardId: board.id, role: "owner" } });

  return res.status(201).json({ ok: true });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password)
    return res.status(400).json({ error: "username & password required" });

  const user = await prisma.user.findUnique({
    where: { username },
    include: { memberships: true },
  });
  if (!user) return res.status(401).json({ error: "user not found" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid password" });

  const boardIds = user.memberships.map((m) => m.boardId);
  const token = jwt.sign(
    { userId: user.id, username: user.username, boardIds },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username },
    boardIds,
  });
});

router.get("/boards", async (req, res) => {
  const payload = getUserFromAuthHeader(req, res);
  if (!payload) return; 

  const boards = await prisma.board.findMany({
    where: { memberships: { some: { userId: payload.userId } } },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  res.json({ boards });
});

export default router;
