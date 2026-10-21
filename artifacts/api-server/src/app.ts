import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./lib/auth";

const app: Express = express();
const rateLimitHits = new Map<string, { count: number; resetAt: number }>();

function securityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function sensitiveRouteRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!/^\/api\/(auth|checkout\/payment)/.test(req.path)) {
    next();
    return;
  }
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const hit = rateLimitHits.get(key) ?? { count: 0, resetAt: now + 60_000 };
  if (hit.resetAt < now) {
    hit.count = 0;
    hit.resetAt = now + 60_000;
  }
  hit.count += 1;
  rateLimitHits.set(key, hit);
  if (hit.count > 30) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      const allowed = (process.env.CORS_ORIGIN ?? "").split(",").map((item) => item.trim()).filter(Boolean);
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sensitiveRouteRateLimit);
app.use("/api", authMiddleware);
app.use("/api", router);

export default app;
