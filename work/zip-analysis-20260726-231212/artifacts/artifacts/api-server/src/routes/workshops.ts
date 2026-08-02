import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, workshopsTable, bookingsTable } from "@workspace/db";
import {
  ListWorkshopsQueryParams,
  ListWorkshopsResponse,
  GetWorkshopParams,
  GetWorkshopResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/workshops", async (req, res): Promise<void> => {
  const params = ListWorkshopsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conditions = [];
  if (params.data.city) conditions.push(eq(workshopsTable.city, params.data.city));
  if (params.data.service)
    conditions.push(sql`${workshopsTable.services} @> ${JSON.stringify([params.data.service])}::jsonb`);

  const rows = await db
    .select()
    .from(workshopsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(workshopsTable.rating));

  res.json(
    ListWorkshopsResponse.parse(
      rows.map((w) => ({ ...w, rating: Number(w.rating) })),
    ),
  );
});

router.get("/workshops/:workshopId", async (req, res): Promise<void> => {
  const params = GetWorkshopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [w] = await db
    .select()
    .from(workshopsTable)
    .where(eq(workshopsTable.id, params.data.workshopId));
  if (!w) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  const [{ recentBookingsCount }] = await db
    .select({ recentBookingsCount: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.workshopId, w.id));

  res.json(
    GetWorkshopResponse.parse({
      ...w,
      rating: Number(w.rating),
      recentBookingsCount,
    }),
  );
});

export default router;
