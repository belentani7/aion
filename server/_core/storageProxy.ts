import type { Express, Request } from "express";
import { ENV } from "./env";

export interface StorageProxyPolicy {
  /** Must check BOTH authenticated identity and access to this exact object key. */
  authorize: (request: Request, key: string) => boolean | Promise<boolean>;
}

/** No public signing oracle: without an object-level access policy the route denies access. */
export function registerStorageProxy(app: Express, policy?: StorageProxyPolicy) {
  // RegExp routes work with both Express 4 and Express 5 wildcard semantics.
  app.get(/^\/manus-storage\/(.*)$/, async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || Buffer.byteLength(key, "utf8") > 1024 || /[\\\x00-\x1f\x7f%]/.test(key) ||
        key.split("/").some(segment => !segment || segment === "." || segment === "..")) {
      res.status(400).send("Invalid storage key");
      return;
    }
    let allowed = false;
    try { allowed = policy ? await policy.authorize(req, key) === true : false; }
    catch { /* Deny before any provider call; do not log request credentials. */ }
    if (!allowed) {
      res.status(403).send("Storage access requires an object authorization policy");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(503).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      if (forgeUrl.protocol !== "https:" || forgeUrl.username || forgeUrl.password) {
        res.status(503).send("Storage service requires HTTPS");
        return;
      }
      forgeUrl.searchParams.set("path", key);
      const response = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        res.status(502).send("Storage backend error");
        return;
      }
      const data = await response.json() as { url?: unknown };
      if (typeof data.url !== "string") {
        res.status(502).send("Invalid storage response");
        return;
      }
      const destination = new URL(data.url);
      if (destination.protocol !== "https:" || destination.username || destination.password) {
        res.status(502).send("Invalid storage redirect");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, destination.href);
    } catch {
      // Provider errors/bodies and signed URLs can contain secrets: never dump them.
      res.status(502).send("Storage proxy error");
    }
  });
}
