import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  bookingsTable,
  workshopsTable,
} from "@workspace/db";
import {
  ListBookingsResponse,
  CreateBookingBody,
  UpdateBookingParams,
  UpdateBookingBody,
  UpdateBookingResponse,
} from "@workspace/api-zod";
import { DEMO_USER_ID } from "../lib/demo";

const router: IRouter = Router();

router.get("/bookings", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: bookingsTable.id,
      vehicleId: bookingsTable.vehicleId,
      vehicleMake: vehiclesTable.make,
      vehicleModel: vehiclesTable.model,
      workshopId: bookingsTable.workshopId,
      workshopName: workshopsTable.name,
      workshopNameAr: workshopsTable.nameAr,
      serviceType: bookingsTable.serviceType,
      serviceTypeAr: bookingsTable.serviceTypeAr,
      scheduledAt: bookingsTable.scheduledAt,
      status: bookingsTable.status,
      estimatedCost: bookingsTable.estimatedCost,
      finalCost: bookingsTable.finalCost,
      createdAt: bookingsTable.createdAt,
    })
    .from(bookingsTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, bookingsTable.vehicleId))
    .innerJoin(workshopsTable, eq(workshopsTable.id, bookingsTable.workshopId))
    .where(eq(bookingsTable.userId, DEMO_USER_ID))
    .orderBy(desc(bookingsTable.scheduledAt));
  res.json(ListBookingsResponse.parse(rows));
});

router.post("/bookings", async (req, res): Promise<void> => {
  const body = CreateBookingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [v] = await db
    .select()
    .from(vehiclesTable)
    .where(
      and(
        eq(vehiclesTable.id, body.data.vehicleId),
        eq(vehiclesTable.userId, DEMO_USER_ID),
      ),
    );
  if (!v) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const [w] = await db
    .select()
    .from(workshopsTable)
    .where(eq(workshopsTable.id, body.data.workshopId));
  if (!w) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  const serviceTypeAr = serviceTypeArabic(body.data.serviceType);
  const [b] = await db
    .insert(bookingsTable)
    .values({
      userId: DEMO_USER_ID,
      vehicleId: body.data.vehicleId,
      workshopId: body.data.workshopId,
      serviceType: body.data.serviceType,
      serviceTypeAr,
      scheduledAt: body.data.scheduledAt,
      status: "pending",
      notes: body.data.notes,
      estimatedCost: 250,
    })
    .returning();
  res.status(201).json(
    UpdateBookingResponse.parse({
      ...b,
      vehicleMake: v.make,
      vehicleModel: v.model,
      workshopName: w.name,
      workshopNameAr: w.nameAr,
    }),
  );
});

router.patch("/bookings/:bookingId", async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateBookingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [b] = await db
    .update(bookingsTable)
    .set(body.data)
    .where(
      and(
        eq(bookingsTable.id, params.data.bookingId),
        eq(bookingsTable.userId, DEMO_USER_ID),
      ),
    )
    .returning();
  if (!b) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const [v] = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.id, b.vehicleId));
  const [w] = await db
    .select()
    .from(workshopsTable)
    .where(eq(workshopsTable.id, b.workshopId));
  res.json(
    UpdateBookingResponse.parse({
      ...b,
      vehicleMake: v?.make,
      vehicleModel: v?.model,
      workshopName: w?.name,
      workshopNameAr: w?.nameAr,
    }),
  );
});

function serviceTypeArabic(t: string): string {
  const map: Record<string, string> = {
    oil_change: "تغيير زيت",
    full_inspection: "فحص شامل",
    brake_service: "صيانة مكابح",
    tire_rotation: "تدوير إطارات",
    ac_service: "صيانة مكيف",
    battery_check: "فحص بطارية",
    diagnostic_scan: "فحص أعطال",
    general: "صيانة عامة",
  };
  return map[t] ?? t;
}

export default router;
