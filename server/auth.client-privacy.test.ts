import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorBoundary from "../client/src/components/ErrorBoundary";
import { clearLegacyProfileCache, useAuth } from "../client/src/_core/hooks/useAuth";

vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      auth: { me: { setData: vi.fn(), invalidate: vi.fn(async () => undefined) } },
    }),
    auth: {
      me: {
        useQuery: () => ({
          data: { id: 1, name: "Synthetic test user" },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      logout: {
        useMutation: () => ({
          mutateAsync: vi.fn(async () => undefined),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

afterEach(() => vi.unstubAllGlobals());

describe("client privacy and recovery", () => {
  it("removes a legacy profile when storage works and tolerates blocked storage", () => {
    const removeItem = vi.fn();
    clearLegacyProfileCache({ removeItem });
    expect(removeItem).toHaveBeenCalledWith("manus-runtime-user-info");

    expect(() => clearLegacyProfileCache({
      removeItem: () => { throw new Error("SecurityError"); },
    })).not.toThrow();
  });

  it("renders an authenticated session without writing profile data to blocked storage", () => {
    const setItem = vi.fn(() => {
      throw new Error("SecurityError: storage is disabled");
    });
    vi.stubGlobal("localStorage", { setItem });

    function Probe() {
      const auth = useAuth();
      return createElement("span", null, auth.user?.name ?? "anonymous");
    }

    expect(renderToStaticMarkup(createElement(Probe))).toContain("Synthetic test user");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("shows an accessible recovery screen without disclosing an exception stack", () => {
    const boundary = new ErrorBoundary({ children: null });
    const error = new Error("Synthetic error");
    error.stack = "SENSITIVE_INTERNAL_STACK";
    boundary.state = ErrorBoundary.getDerivedStateFromError(error);

    const html = renderToStaticMarkup(boundary.render());
    expect(html).toContain('role="alert"');
    expect(html).toContain("An unexpected error occurred.");
    expect(html).toContain("Reload Page");
    expect(html).not.toContain("SENSITIVE_INTERNAL_STACK");
    expect(html).not.toContain("Synthetic error");
  });
});
