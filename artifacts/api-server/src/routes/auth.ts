import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { generateOtp, storeOtp, verifyOtp, TEST_PHONES } from "../lib/auth";
import { DEMO_USER_ID, DEMO_ADMIN_ID } from "../lib/demo";

const router: IRouter = Router();

/** POST /api/auth/send-otp */
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { phone, name } = req.body ?? {};
  if (!phone || typeof phone !== "string" || phone.length < 9) {
    res.status(400).json({ error: "رقم الجوال غير صحيح" });
    return;
  }

  const code = generateOtp(phone);
  storeOtp(phone, code);

  const isTest = !!TEST_PHONES[phone];
  console.log(`[OTP] +966${phone} → ${code}`);

  res.json({ sent: true, isTest, ...(isTest ? { code } : {}) });
});

/** POST /api/auth/verify-otp */
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { phone, code, name } = req.body ?? {};
  if (!phone || !code || typeof code !== "string" || code.length !== 6) {
    res.status(400).json({ error: "البيانات غير مكتملة" });
    return;
  }

  if (!verifyOtp(phone, code)) {
    res.status(401).json({ error: "الرمز غير صحيح أو انتهت صلاحيته" });
    return;
  }

  const fullPhone = `+966${phone}`;

  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.phone, fullPhone)).limit(1);

    if (!user) {
      if (!name || typeof name !== "string" || !name.trim()) {
        res.status(422).json({ error: "الاسم مطلوب للتسجيل" });
        return;
      }
      [user] = await db.insert(usersTable).values({
        phone: fullPhone,
        name: name.trim(),
        role: "user",
      }).returning();
    }

    res.json({ userId: user.id, name: user.name, phone: user.phone, role: user.role });
  } catch (err: any) {
    console.error("[auth/verify-otp]", err);
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
    res.json({ userId: DEMO_USER_ID, name: "مستخدم تجريبي", phone: "+966501234567", role: "user" });
    return;
  }
  if (userId === DEMO_ADMIN_ID) {
    res.json({ userId: DEMO_ADMIN_ID, name: "مدير النظام", phone: "+966502345678", role: "admin" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    res.json({ userId: user.id, name: user.name, phone: user.phone, role: user.role });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/** GET /api/auth/test-users */
router.get("/auth/test-users", (_req, res) => {
  res.json([
    { phone: "501234567", label: "مستخدم تجريبي ١", otp: "123456" },
    { phone: "502345678", label: "مستخدم تجريبي ٢", otp: "123456" },
    { phone: "503456789", label: "مستخدم تجريبي ٣", otp: "123456" },
  ]);
});

export default router;
