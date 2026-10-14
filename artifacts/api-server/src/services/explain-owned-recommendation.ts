import { and, eq } from "drizzle-orm";
import { db, recommendationsTable, vehiclesTable } from "@workspace/db";
import { explainForAssistant, isRecommendationId } from "./vehicle-health-engine.mjs";

export { isRecommendationId };

export async function explainOwnedRecommendation(input: {
  vehicleId: string;
  userId: string;
  recommendationId?: unknown;
}) {
  if (!isRecommendationId(input.recommendationId)) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "recommendationId required",
    };
  }

  const [row] = await db
    .select({
      rec: recommendationsTable,
      ownerId: vehiclesTable.userId,
    })
    .from(recommendationsTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, recommendationsTable.vehicleId))
    .where(
      and(
        eq(recommendationsTable.id, String(input.recommendationId)),
        eq(recommendationsTable.vehicleId, input.vehicleId),
        eq(vehiclesTable.userId, input.userId),
      ),
    );

  if (!row) {
    return { ok: false as const, status: 404 as const, error: "Recommendation not found" };
  }

  return {
    ok: true as const,
    explanation: explainForAssistant({
      titleAr: row.rec.titleAr,
      descriptionAr: row.rec.descriptionAr,
      suggestedAction: row.rec.suggestedAction,
      severity: row.rec.severity,
      evidence: (row.rec.metadata as Record<string, unknown> | null)?.evidence,
      metadata: row.rec.metadata,
      vehicleId: row.rec.vehicleId,
    }),
  };
}
