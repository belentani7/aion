/**
 * Google Maps JS keys are intentionally public browser identifiers, NOT secrets.
 * Restrict them by referrer and API in Google Cloud. Never use a Forge token.
 */
export function getGoogleMapsScriptUrl(browserKey?: string): string | null {
  const key = browserKey?.trim();
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/js");
  url.searchParams.set("key", key);
  url.searchParams.set("v", "weekly");
  url.searchParams.set("libraries", "marker,places,geocoding,geometry");
  return url.toString();
}
