import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createDb } from "@turbok/db";
import { registerAuthRoutes } from "./routes/auth.js";

export interface AppConfig {
  databaseUrl: string;
  sessionSecret: string;
  webOrigin: string;
  host: string;
  port: number;
  nodeEnv: string;
}

export function loadConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const sessionSecret = process.env.SESSION_SECRET;
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!sessionSecret) throw new Error("SESSION_SECRET is required");

  return {
    databaseUrl,
    sessionSecret,
    webOrigin,
    host: process.env.API_HOST ?? "0.0.0.0",
    port: Number(process.env.API_PORT ?? 3001),
    nodeEnv: process.env.NODE_ENV ?? "development",
  };
}

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "production" ? "info" : "debug",
      serializers: {
        req(request) {
          return { method: request.method, url: request.url };
        },
        res(reply) {
          return { statusCode: reply.statusCode };
        },
      },
    },
    genReqId: () => crypto.randomUUID(),
  });

  const db = createDb(config.databaseUrl);
  const secureCookies = config.nodeEnv === "production";

  await app.register(cookie, { secret: config.sessionSecret });
  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.addHook("onRequest", async (request, reply) => {
    request.log.info({ reqId: request.id, route: request.url }, "request");
    reply.header("x-request-id", request.id);
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ready", async (request, reply) => {
    try {
      await db.selectFrom("users").select("id").limit(1).execute();
      return { status: "ready" };
    } catch (error) {
      request.log.error({ err: error }, "ready check failed");
      return reply.status(503).send({ status: "not_ready" });
    }
  });

  await app.register(
    async (authApp) => {
      await authApp.register(rateLimit, {
        max: 20,
        timeWindow: "1 minute",
      });
      await registerAuthRoutes(authApp, db, secureCookies);
    },
    { prefix: "" },
  );

  app.addHook("onClose", async () => {
    await db.destroy();
  });

  return app;
}
