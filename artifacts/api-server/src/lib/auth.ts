import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { DEMO_USER_ID } from "./demo";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userName: string;
      userPhone: string;
    }
  }
}

/** In-memory OTP store: phone → { code, expiresAt } */
export const otpStore = new Map<string, { code: string; expiresAt: number }>();

/** Test phone numbers always get this OTP */
export const TEST_PHONES: Record<string, string> = {
  "501234567": "123456",
  "502345678": "123456",
  "503456789": "123456",
};

export function generateOtp(phone: string): string {
  if (TEST_PHONES[phone]) return TEST_PHONES[phone];
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function storeOtp(phone: string, code: string) {
  otpStore.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
}

export function verifyOtp(phone: string, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { otpStore.delete(phone); return false; }
  if (entry.code !== code) return false;
  otpStore.delete(phone);
  return true;
}

/** Express middleware — resolves userId from Authorization: Bearer <userId> header.
 *  Falls back to DEMO_USER_ID so existing demo data still works. */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token && token !== DEMO_USER_ID) {
      try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, token)).limit(1);
        if (user) {
          req.userId = user.id;
          req.userName = user.name;
          req.userPhone = user.phone;
          return next();
        }
      } catch {}
    }
  }
  req.userId = DEMO_USER_ID;
  req.userName = "مستخدم تجريبي";
  req.userPhone = "+966501234567";
  next();
}
