import { afterEach, describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const originalSecret = ENV.cookieSecret;
afterEach(() => { ENV.cookieSecret = originalSecret; });

describe("session signing secret", () => {
  it.each(["", "short-secret", " ".repeat(32)])("rejects missing, short or blank configuration", async (secret) => {
    ENV.cookieSecret = secret;
    await expect(sdk.createSessionToken("test-user", { name: "Test" })).rejects.toThrow("JWT_SECRET");
  });
  it("signs with a sufficiently long test-only secret", async () => {
    ENV.cookieSecret = "fixture-only-not-a-production-key-0123456789";
    const token = await sdk.createSessionToken("test-user", { name: "Test" });
    expect(token.split(".")).toHaveLength(3);
  });
});
