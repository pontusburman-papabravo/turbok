import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, loadConfig } from "../app.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("auth integration", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const email = `test-${Date.now()}@example.com`;
  const password = "test-password-123";
  let cookie = "";

  beforeAll(async () => {
    app = await buildApp(loadConfig());
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers, logs in, returns me, and logs out", async () => {
    const register = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password },
    });
    expect(register.statusCode).toBe(201);
    cookie = register.cookies.find((c) => c.name === "turbok_session")?.value ?? "";
    expect(cookie).toBeTruthy();

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { turbok_session: cookie },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(email);

    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { turbok_session: cookie },
    });
    expect(logout.statusCode).toBe(200);

    const meAfter = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { turbok_session: cookie },
    });
    expect(meAfter.statusCode).toBe(401);
  });
});
