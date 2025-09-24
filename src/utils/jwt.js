import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET;
export function signToken(payload, options = { expiresIn: "7d" }) {
  return jwt.sign(payload, JWT_SECRET, options);
}
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
