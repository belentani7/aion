import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createApp } from "./_core/app";
const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())))); });
async function request(path: string) {
  const server = createServer(createApp());
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server unavailable");
  return fetch(`http://127.0.0.1:${address.port}${path}`);
}
describe("HTTP deployment contract", () => {
  it("provides explicit HTTP-only health without claiming provider readiness", async () => {
    const response = await request("/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({service: "aion", status: "ok", scope: "http", providersVerified: false});
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-powered-by")).toBeNull();
  });
  it("returns JSON 404 for an unknown API, never the frontend HTML", async () => {
    const response = await request("/api/not-a-real-endpoint");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
  it("keeps storage access closed without object authorization", async () => {
    expect((await request("/manus-storage/private/test.txt")).status).toBe(403);
  });
});
