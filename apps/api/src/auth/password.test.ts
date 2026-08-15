import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes and verifies with Argon2id", async () => {
    const hash = await hashPassword("secure-password");
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword("secure-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
