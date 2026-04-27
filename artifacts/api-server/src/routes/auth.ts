import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/auth";
import { DEMO_USER_ID, DEMO_ADMIN_ID } from "../lib/demo";

const router: IRouter = Router();

/** POST /api/auth/register */
router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, phone, email, password } = req.body ?? {};

  if (!name?.trim() || !phone?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
    return;
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email.trim())) {
    res.status(400).json({ error: "البريد الإلكتروني غير صحيح" });
    return;
  }

  const fullPhone = phone.trim().startsWith("+") ? phone.trim() : `+966${phone.trim()}`;
  const normalEmail = email.trim().toLowerCase();

  try {
    const existing = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(or(eq(usersTable.email, normalEmail), eq(usersTable.phone, fullPhone)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "يوجد حساب مسجل بهذا البريد أو الجوال مسبقاً" });
      return;
    }

    const passwordHash = hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      name: name.trim(),
      phone: fullPhone,
      email: normalEmail,
      passwordHash,
      role: "user",
    }).returning();

    res.status(201).json({ userId: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role });
  } catch (err: any) {
    console.error("[auth/register]", err);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/** POST /api/auth/login */
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    return;
  }

  const normalEmail = email.trim().toLowerCase();

  try {
    const [user] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, normalEmail))
      .limit(1);

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      return;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      return;
    }

    res.json({ userId: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role });
  } catch (err: any) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/** GET /api/auth/me */
router.get("/auth/me", async (req, res): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مخوّل" });
    return;
  }

  const userId = header.slice(7).trim();

  if (userId === DEMO_USER_ID) {
    res.json({ userId: DEMO_USER_ID, name: "مستخدم تجريبي", email: "demo@mfk.sa", phone: "+966501234567", role: "user" });
    return;
  }
  if (userId === DEMO_ADMIN_ID) {
    res.json({ userId: DEMO_ADMIN_ID, name: "مدير النظام", email: "admin@mfk.sa", phone: "+966502345678", role: "admin" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    res.json({ userId: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
