import type { FastifyInstance, FastifyReply } from "fastify";
import type { Kysely } from "kysely";
import type { Database } from "@turbok/db";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { loginSchema, registerSchema } from "../auth/schemas.js";
import {
  createSessionToken,
  getSessionCookieName,
  hashSessionToken,
  sessionExpiresAt,
} from "../auth/session.js";

const SESSION_COOKIE = getSessionCookieName();

function setSessionCookie(reply: FastifyReply, token: string, secure: boolean): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  db: Kysely<Database>,
  secureCookies: boolean,
): Promise<void> {
  app.post("/api/v1/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const existing = await db
      .selectFrom("users")
      .select("id")
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst();

    if (existing) {
      return reply.status(409).send({ error: "email_taken" });
    }

    const passwordHash = await hashPassword(password);
    const user = await db
      .insertInto("users")
      .values({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: "user",
      })
      .returning(["id", "email", "role", "created_at", "updated_at"])
      .executeTakeFirstOrThrow();

    const token = createSessionToken();
    await db
      .insertInto("sessions")
      .values({
        id: hashSessionToken(token),
        user_id: user.id,
        expires_at: sessionExpiresAt(),
      })
      .execute();

    setSessionCookie(reply, token, secureCookies);

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return reply.status(401).send({ error: "invalid_credentials" });
    }

    const token = createSessionToken();
    await db
      .insertInto("sessions")
      .values({
        id: hashSessionToken(token),
        user_id: user.id,
        expires_at: sessionExpiresAt(),
      })
      .execute();

    setSessionCookie(reply, token, secureCookies);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      await db.deleteFrom("sessions").where("id", "=", hashSessionToken(token)).execute();
    }
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/api/v1/auth/me", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const session = await db
      .selectFrom("sessions")
      .innerJoin("users", "users.id", "sessions.user_id")
      .select([
        "users.id",
        "users.email",
        "users.role",
        "users.created_at",
        "users.updated_at",
        "sessions.expires_at",
      ])
      .where("sessions.id", "=", hashSessionToken(token))
      .executeTakeFirst();

    if (!session || session.expires_at < new Date()) {
      if (token) {
        await db.deleteFrom("sessions").where("id", "=", hashSessionToken(token)).execute();
      }
      clearSessionCookie(reply);
      return reply.status(401).send({ error: "unauthorized" });
    }

    return reply.send({
      user: {
        id: session.id,
        email: session.email,
        role: session.role,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
    });
  });
}
