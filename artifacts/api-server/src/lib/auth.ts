import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DEMO_ADMIN_ID, DEMO_USER_ID } from "./demo";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userRole?: "user" | "admin" | "fleet";
    }
  }
}

const SCRYPT_KEYLEN = 64;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

type AuthTokenPayload = {
  sub: string;
  role: "user" | "admin" | "fleet";
  exp: number;
};

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

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function tokenSecret(): string {
  return process.env.JWT_SECRET || process.env.AUTH_TOKEN_SECRET || "mofk-dev-secret-change-me";
}

export function issueAuthToken(userId: string, role: "user" | "admin" | "fleet" = "user"): string {
  const payload: AuthTokenPayload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = base64Url(JSON.stringify(payload));
  const sig = createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload;
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    const payload = verifyAuthToken(token);
    if (payload) {
      req.userId = payload.sub;
      req.userRole = payload.role;
      next();
      return;
    }
    if (token === DEMO_ADMIN_ID) {
      req.userId = DEMO_ADMIN_ID;
      req.userRole = "admin";
      next();
      return;
    }
    if (token && token.length > 10) {
      req.userId = token;
      req.userRole = "user";
      next();
      return;
    }
  }
  req.userId = DEMO_USER_ID;
  req.userRole = "user";
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.userRole === "admin") {
    next();
    return;
  }

  try {
    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    if (user?.role === "admin") {
      req.userRole = "admin";
      next();
      return;
    }
  } catch {
    // Fall through to forbidden.
  }

  res.status(403).json({ error: "Admin role required" });
}
