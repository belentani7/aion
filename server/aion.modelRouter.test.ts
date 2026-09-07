import { describe, expect, it } from "vitest";
import { routeLocalModel } from "./aion/modelRouter";

describe("AION local model router", () => {
  it("returns an explicit fallback when no local provider has the requested capability", async () => {
    const result = await routeLocalModel("vision");
    expect(result.kind).toBe("vision");
    expect(result.fallback).toBe(true);
    expect(result.provider).toBeNull();
  });
});
