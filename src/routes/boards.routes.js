import express from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/boards
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const boards = await prisma.board.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { id: "asc" }
    });
    return res.json({ boards });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal server error" });
  }
});

export default router;
