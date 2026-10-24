export type FuelCalculationRow = {
  id: string;
  filled_at: string;
  odometer_km: number | null;
  liters: number | string;
  total_cost_halalas: number;
  is_full?: boolean | null;
};

export type FuelConsumption = {
  distanceKm: number;
  consumptionL100km: number;
  kmPerLiter: number;
};

export type FuelStatsCalculation = {
  totalLiters: number;
  totalCostSar: number;
  avgConsumptionL100km: number | null;
  avgKmPerLiter: number | null;
  fillCount: number;
  trendByDay: { date: string; liters: number; costSar: number; fills: number }[];
};

function validOdometer(value: number | null | undefined): value is number {
  return Number.isFinite(value) && Number(value) > 0;
}

export function filterFuelRowsByPeriod(rows: FuelCalculationRow[], period: string, now = new Date()) {
  if (period === "all") return rows;

  const from = new Date(now);
  if (period === "week") {
    from.setDate(now.getDate() - 7);
  } else if (period === "month") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  } else {
    return rows;
  }

  return rows.filter((row) => {
    const date = new Date(row.filled_at);
    return Number.isFinite(date.getTime()) && date >= from;
  });
}

/**
 * Calculates only complete-fill intervals. Partial fills are included in the
 * litres accumulated between two complete fills, but receive no standalone
 * consumption value. Invalid or missing odometers never create a distance.
 */
export function withFuelConsumption(rows: FuelCalculationRow[]) {
  const asc = [...rows].sort((a, b) => {
    const odometerDelta = Number(a.odometer_km ?? 0) - Number(b.odometer_km ?? 0);
    return odometerDelta || new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime();
  });
  const map = new Map<string, FuelConsumption>();
  let previousFull: FuelCalculationRow | null = null;
  let litresSinceFull = 0;

  for (const row of asc) {
    // Unknown historical fill types must always break an interval.
    if (row.is_full == null) {
      previousFull = null;
      litresSinceFull = 0;
      continue;
    }
    const rowLiters = Number(row.liters);
    if (!Number.isFinite(rowLiters) || rowLiters <= 0) continue;
    if (!validOdometer(row.odometer_km)) {
      previousFull = null;
      litresSinceFull = 0;
      continue;
    }

    if (row.is_full === false) {
      if (previousFull) litresSinceFull += rowLiters;
      continue;
    }

    if (!previousFull) {
      previousFull = row;
      litresSinceFull = 0;
      continue;
    }

    const distanceKm = Number(row.odometer_km) - Number(previousFull.odometer_km);
    const litres = litresSinceFull + rowLiters;
    if (distanceKm > 0 && litres > 0) {
      map.set(row.id, {
        distanceKm,
        consumptionL100km: Number(((litres / distanceKm) * 100).toFixed(2)),
        kmPerLiter: Number((distanceKm / litres).toFixed(2)),
      });
    }

    previousFull = row;
    litresSinceFull = 0;
  }

  return rows.map((row) => ({ row, consumption: map.get(row.id) ?? null }));
}

export function buildFuelStats(rows: FuelCalculationRow[], period: string, now = new Date()): FuelStatsCalculation {
  const filtered = filterFuelRowsByPeriod(rows, period, now);
  const calculated = withFuelConsumption(rows);
  const filteredIds = new Set(filtered.map((row) => row.id));
  const validIntervals = calculated.filter(({ row, consumption }) => filteredIds.has(row.id) && consumption);
  const totalDistance = validIntervals.reduce((sum, item) => sum + (item.consumption?.distanceKm ?? 0), 0);
  const totalConsumptionLitres = validIntervals.reduce((sum, item) => {
    const distance = item.consumption?.distanceKm ?? 0;
    const l100 = item.consumption?.consumptionL100km ?? 0;
    return sum + (distance * l100) / 100;
  }, 0);
  const validDates = filtered
    .map((row) => new Date(row.filled_at).getTime())
    .filter(Number.isFinite);
  const spanDays = validDates.length > 1 ? (Math.max(...validDates) - Math.min(...validDates)) / 86_400_000 : 0;
  const bucket = (date: string) => {
    if (period === "year" || (period === "all" && spanDays > 370)) return date.slice(0, 7);
    if (period === "all" && spanDays > 60) {
      const parsed = new Date(`${date}T00:00:00`);
      const start = new Date(parsed);
      start.setDate(parsed.getDate() - parsed.getDay());
      return start.toISOString().slice(0, 10);
    }
    return date;
  };
  const byPeriod = new Map<string, { date: string; liters: number; costSar: number; fills: number }>();

  for (const row of filtered) {
    const date = bucket(row.filled_at.slice(0, 10));
    const current = byPeriod.get(date) ?? { date, liters: 0, costSar: 0, fills: 0 };
    current.liters += Number(row.liters || 0);
    current.costSar += Number(row.total_cost_halalas || 0) / 100;
    current.fills += 1;
    byPeriod.set(date, current);
  }

  return {
    totalLiters: Number(filtered.reduce((sum, row) => sum + Number(row.liters || 0), 0).toFixed(2)),
    totalCostSar: Number(filtered.reduce((sum, row) => sum + Number(row.total_cost_halalas || 0) / 100, 0).toFixed(2)),
    avgConsumptionL100km: totalDistance > 0 ? Number(((totalConsumptionLitres / totalDistance) * 100).toFixed(2)) : null,
    avgKmPerLiter: totalConsumptionLitres > 0 ? Number((totalDistance / totalConsumptionLitres).toFixed(2)) : null,
    fillCount: filtered.length,
    trendByDay: Array.from(byPeriod.values()).sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({
      ...item,
      liters: Number(item.liters.toFixed(2)),
      costSar: Number(item.costSar.toFixed(2)),
    })),
  };
}
