import { createHash, randomBytes } from "node:crypto";

const SESSION_COOKIE = "turbok_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
