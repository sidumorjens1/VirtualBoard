import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const {
  JWT_SECRET = 'dev-secret',
  ACCESS_TOKEN_TTL = '15m',   
  REFRESH_TOKEN_TTL_DAYS = '30',
} = process.env;

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function newRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export const REFRESH_TTL_DAYS = Number(REFRESH_TOKEN_TTL_DAYS || 30);
