import { afterEach, describe, expect, it, vi } from "vitest";
import { reportAuthFailure, type AuthDiagnostic } from "./_core/authLogging";

afterEach(() => vi.restoreAllMocks());

describe("authentication diagnostics", () => {
  it("writes only fixed event names, never provider errors or credentials", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const expected: AuthDiagnostic[] = [
      "oauth-service-unconfigured",
      "oauth-callback-failed",
      "session-verification-rejected",
      "user-sync-failed",
    ];

    for (const stage of expected) reportAuthFailure(stage);

    expect(error.mock.calls).toEqual([
      ["[Auth] oauth-service-unconfigured"],
      ["[Auth] oauth-callback-failed"],
      ["[Auth] user-sync-failed"],
    ]);
    expect(warn.mock.calls).toEqual([["[Auth] session-verification-rejected"]]);
    const allMessages = [...error.mock.calls, ...warn.mock.calls].flat().join(" ");
    expect(allMessages).not.toMatch(/accessToken|Bearer|code=|cookie|https?:\/\//i);
  });
});
