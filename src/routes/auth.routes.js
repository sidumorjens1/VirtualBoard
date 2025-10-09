import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const router = express.Router();

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "30", 10);

function getBearer(req) {
  const h = req.headers["authorization"] || "";
  const parts = h.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
}

function signAccessToken({ user, boardIds }) {
  return jwt.sign(
    { userId: user.id, username: user.username, boardIds },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function newRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

// register
router.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password)
    return res.status(400).json({ error: "username & password required" });

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ error: "username already exists" });

  const passwordHash = await bcrypt.hash(password, ROUNDS);
  const user = await prisma.user.create({ data: { username, passwordHash } });

  // skapar boards
  const board = await prisma.board.create({ data: { title: `${username}` } });
  await prisma.membership.create({ data: { userId: user.id, boardId: board.id, role: "owner" } });

  return res.status(201).json({ ok: true });
});

// Login och refreshtoken 
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
  const accessToken = signAccessToken({ user, boardIds });

  // skapa och spara refresh token
  const refreshToken = newRefreshToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,     
      token: refreshToken,  
      issuedAt: now,
      expiresAt,
    },
  });

  res.json({
    token: accessToken,
    accessToken,                 
    refreshToken,
    user: { id: user.id, username: user.username },
    boardIds,
  });
});

// hemta boards
router.get("/boards", async (req, res) => {
  // verifiera access token från authorization bearer
  const tok = getBearer(req);
  if (!tok) return res.status(401).json({ error: "missing token" });

  let payload;
  try {
    payload = jwt.verify(tok, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "invalid token" });
  }

  const boards = await prisma.board.findMany({
    where: { memberships: { some: { userId: payload.userId } } },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  res.json({ boards });
});

// Post och ny access token med refresh token
router.post("/refresh", async (req, res) => {
  const refresh = getBearer(req) || req.body?.refreshToken;
  if (!refresh) return res.status(400).json({ error: "Missing refresh token" });

  const row = await prisma.refreshToken.findFirst({ where: { token: refresh } });
  if (!row) return res.status(401).json({ error: "Invalid refresh token" });

  if (row.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: row.id } }).catch(() => {});
    return res.status(401).json({ error: "Refresh token expired" });
  }

  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    include: { memberships: true },
  });
  if (!user) {
    await prisma.refreshToken.delete({ where: { id: row.id } }).catch(() => {});
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const boardIds = user.memberships.map((m) => m.boardId);
  const newAccess = signAccessToken({ user, boardIds });

  // returnera access och refreshtoken 
  res.json({ token: newAccess, accessToken: newAccess });
});

// delete refreshtoken om logout 
router.delete("/refresh", async (req, res) => {
  const refresh = getBearer(req) || req.body?.refreshToken;
  if (!refresh) return res.status(400).json({ error: "Missing refresh token" });

  await prisma.refreshToken.deleteMany({ where: { token: refresh } });
  res.status(204).end();
});

export default router;
