import { describe, expect, it } from "vitest";
import { getGoogleMapsScriptUrl } from "../client/src/lib/google-maps-url";

describe("browser Google Maps key isolation", () => {
  it("never loads Google Maps without a dedicated public browser key", () => {
    expect(getGoogleMapsScriptUrl()).toBeNull();
    expect(getGoogleMapsScriptUrl("  ")).toBeNull();
  });

  it("uses Google's expected origin and an explicit browser key", () => {
    const result = getGoogleMapsScriptUrl("  browser_key_example  ");
    const url = new URL(result!);
    expect(url.origin).toBe("https://maps.googleapis.com");
    expect(url.pathname).toBe("/maps/api/js");
    expect(url.searchParams.get("key")).toBe("browser_key_example");
    expect(url.searchParams.get("libraries")).toContain("places");
    expect(url.href).not.toContain("forge.butterfly-effect.dev");
  });
});
