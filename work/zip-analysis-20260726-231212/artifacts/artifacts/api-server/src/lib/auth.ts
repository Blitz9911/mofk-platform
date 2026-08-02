import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { DEMO_USER_ID } from "./demo";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf = Buffer.from(hash, "hex");
    const derivedBuf = scryptSync(password, salt, SCRYPT_KEYLEN);
    return timingSafeEqual(hashBuf, derivedBuf);
  } catch {
    return false;
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token && token.length > 10) {
      req.userId = token;
      next();
      return;
    }
  }
  req.userId = DEMO_USER_ID;
  next();
}
