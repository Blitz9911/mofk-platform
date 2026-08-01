import { Router, type IRouter, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, vehiclesTable } from "@workspace/db";
import { GetAiRecommendationsParams } from "@workspace/api-zod";
import { z } from "zod";
import { logger } from "../lib/logger";
import { MofkAiError, generateMofkAiAnswer } from "../services/mofk-ai";
import { persistEvaluation } from "./recommendations";

const router: IRouter = Router();

const AiChatRequestBody = z.object({
  message: z.string().trim().min(2).max(2000),
}).strict();

router.post("/ai/chat", async (req, res): Promise<void> => {
  const body = AiChatRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_MESSAGE",
        message: "اكتب سؤالك بشكل واضح بين حرفين و2000 حرف.",
      },
    });
    return;
  }

  try {
    const result = await generateMofkAiAnswer(body.data.message);
    res.json({ success: true, data: result });
  } catch (error) {
    sendAiError(res, error, body.data.message.length, (req as { id?: string }).id);
  }
});

router.get(
  "/ai/recommendations/:vehicleId",
  async (req, res): Promise<void> => {
    const params = GetAiRecommendationsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [v] = await db
      .select()
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.id, params.data.vehicleId),
          eq(vehiclesTable.userId, req.userId),
        ),
      );
    if (!v) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    const evaluated = await persistEvaluation(params.data.vehicleId, req.userId);
    res.json(evaluated ?? []);
  },
);

function sendAiError(
  res: Response,
  error: unknown,
  messageLength: number,
  requestId?: string,
) {
  const normalized = error instanceof MofkAiError
    ? error
    : new MofkAiError("provider_error", "Unexpected AI error.", { cause: error });

  const response = mapErrorResponse(normalized);
  const logPayload = {
    requestId,
    code: normalized.code,
    messageLength,
  };

  if (response.status >= 500) {
    logger.error({ ...logPayload, err: normalized }, "Mofk AI chat failed");
  } else {
    logger.warn(logPayload, "Mofk AI chat rejected");
  }

  res.status(response.status).json({
    success: false,
    error: {
      code: response.code,
      message: response.message,
    },
  });
}

function mapErrorResponse(error: MofkAiError): { status: number; code: string; message: string } {
  switch (error.code) {
    case "missing_config":
      return {
        status: 500,
        code: "AI_NOT_CONFIGURED",
        message: "خدمة المساعد الذكي غير مهيأة حالياً.",
      };
    case "rate_limit":
      return {
        status: 429,
        code: "AI_RATE_LIMITED",
        message: "المساعد الذكي مشغول حالياً، جرّب بعد قليل.",
      };
    case "timeout":
      return {
        status: 504,
        code: "AI_TIMEOUT",
        message: "تأخر رد المساعد الذكي، جرّب مرة أخرى.",
      };
    case "invalid_response":
      return {
        status: 502,
        code: "AI_INVALID_RESPONSE",
        message: "وصل رد غير مكتمل من المساعد الذكي، جرّب مرة أخرى.",
      };
    case "provider_error":
    default:
      return {
        status: 500,
        code: "AI_INTERNAL_ERROR",
        message: "تعذر تشغيل المساعد الذكي حالياً.",
      };
  }
}

export default router;
