import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  listRecommendationEvents,
  persistEvaluation,
  updateRecommendationLifecycle,
} from "../services/recommendation-store";

export { persistEvaluation };

const ActionBody = z.object({
  action: z.enum(["defer", "dismiss", "in_progress", "link"]),
  deferredUntil: z.string().optional(),
  maintenanceLogId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
});

const router: IRouter = Router();

router.patch("/recommendations/:id", async (req, res): Promise<void> => {
  const body = ActionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const result = await updateRecommendationLifecycle({
    recommendationId: String(req.params.id),
    userId: req.userId,
    ...body.data,
  });
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.recommendation);
});

router.get("/recommendations/:id/events", async (req, res): Promise<void> => {
  const events = await listRecommendationEvents(String(req.params.id), req.userId);
  if (!events) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }
  res.json(events);
});

export default router;
