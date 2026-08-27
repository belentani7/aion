import { describe, expect, it } from "vitest";
import { routeLocalModel } from "./aion/modelRouter";

describe("AION local model router", () => {
  it("returns an explicit local fallback when no local runtime is reachable", async () => {
    const result = await routeLocalModel("coding");
    expect(result.kind).toBe("coding");
    expect(result.fallback).toBe(true);
    expect(result.provider).toBeNull();
  });
});
