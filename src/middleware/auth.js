import { verifyToken } from "../utils/jwt.js";
export function requireAuth(req, res, next) {
  const auth = req.headers["authorization"] || "";
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    req.user = verifyToken(token); 
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
