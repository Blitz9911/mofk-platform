if (path === "/api/fuel" && method === "POST") {
  const body = await readJsonBody(input, init);

  const vehicleId = String(body.vehicleId ?? "").trim();

  const rawOdometerKm =
    body.odometerKm !== undefined &&
    body.odometerKm !== null &&
    body.odometerKm !== ""
      ? Number(body.odometerKm)
      : null;

  const liters = Number(body.liters);
  const pricePerLiterSar = Number(body.pricePerLiterSar);
  const fuelGrade = String(body.fuelGrade ?? "91").trim();
  const filledAt = String(body.filledAt ?? new Date().toISOString()).trim();

  if (!vehicleId) {
    throw new ApiBridgeError("اختر المركبة أولًا.", 400);
  }

  if (!liters || liters <= 0) {
    throw new ApiBridgeError("كمية الوقود غير صحيحة.", 400);
  }

  if (!pricePerLiterSar || pricePerLiterSar <= 0) {
    throw new ApiBridgeError("سعر اللتر غير صحيح.", 400);
  }

  const vehicle = await getVehicleRow(vehicleId, session.access_token);

  if (!vehicle) {
    throw new ApiBridgeError("المركبة غير موجودة.", 404);
  }

  if (
    rawOdometerKm !== null &&
    (!Number.isFinite(rawOdometerKm) || rawOdometerKm < 0)
  ) {
    throw new ApiBridgeError("قراءة العداد غير صحيحة.", 400);
  }

  const odometerKm =
    rawOdometerKm !== null
      ? rawOdometerKm
      : Number(vehicle.odometer_km ?? 0);

  const pricePerLiterHalalas = Math.round(pricePerLiterSar * 100);
  const totalCostHalalas = Math.round(liters * pricePerLiterSar * 100);

  const rows = await supabaseRequest<FuelLogRow[]>(
    "/rest/v1/fuel_logs?select=*",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        user_id: session.user.id,
        filled_at: filledAt,
        odometer_km: odometerKm,
        liters,
        price_per_liter_halalas: pricePerLiterHalalas,
        total_cost_halalas: totalCostHalalas,
        fuel_grade: fuelGrade,
        station_name_ar:
          typeof body.stationNameAr === "string" && body.stationNameAr.trim()
            ? body.stationNameAr.trim()
            : null,
        is_full: false,
        notes:
          typeof body.notes === "string" && body.notes.trim()
            ? body.notes.trim()
            : null,
      }),
    },
    session.access_token,
  );

  if (rows[0]) {
    await createNotificationIfMissing(session.access_token, {
      userId: session.user.id,
      vehicleId,
      type: "fuel",
      severity: "success",
      titleAr: "تم تسجيل تعبئة بنزين",
      bodyAr: `تم تسجيل ${Number(rows[0].liters).toFixed(2)} لتر بقيمة ${(rows[0].total_cost_halalas / 100).toFixed(2)} ر.س`,
      actionUrl: "/app/fuel",
      dedupeKey: `fuel:${rows[0].id}`,
    });
  }

  return { handled: true, data: toFuelLog(rows[0]), status: 201 };
}
