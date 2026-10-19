import { sha256 } from "./pvcu";

export interface OpenDataSource {
  sourceId: string;
  name: string;
  url: string;
  license: string;
  use: string;
  updateCadence: string;
  rateLimit: string;
  fallback: "cache" | "manual" | "disabled";
  status: "catalogued" | "verified" | "disabled";
}

export const openDataSources: OpenDataSource[] = [
  {
    sourceId: "eurostat-api",
    name: "Eurostat Statistics API",
    url: "https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started",
    license: "Consulta las condiciones de reutilización de la Comisión Europea",
    use: "Referencias estadísticas públicas y contexto económico; no datos personales de empleados",
    updateCadence: "Según dataset",
    rateLimit: "Aplicar caché y límite del consumidor",
    fallback: "cache",
    status: "catalogued",
  },
  {
    sourceId: "data-europa",
    name: "data.europa.eu",
    url: "https://data.europa.eu/en",
    license: "Depende del dataset y de su proveedor",
    use: "Descubrimiento de conjuntos de datos públicos europeos",
    updateCadence: "Según dataset",
    rateLimit: "Respetar API y proveedor de cada dataset",
    fallback: "manual",
    status: "catalogued",
  },
  {
    sourceId: "open-meteo",
    name: "Open-Meteo",
    url: "https://open-meteo.com/",
    license: "Revisar condiciones de uso; gratuito para usos no comerciales",
    use: "Contexto meteorológico opcional para planificación, nunca decisión salarial automática",
    updateCadence: "Consulta bajo demanda con caché",
    rateLimit: "Plan gratuito limitado; sin garantía de uptime",
    fallback: "cache",
    status: "catalogued",
  },
];

export function getOpenDataSource(sourceId: string): OpenDataSource | undefined {
  return openDataSources.find((source) => source.sourceId === sourceId);
}

export function createProvenanceRecord(input: { sourceId: string; retrievedAt?: Date; response: unknown; schemaVersion: string; cacheKey: string }) {
  const source = getOpenDataSource(input.sourceId);
  if (!source) throw new Error(`Unknown open data source: ${input.sourceId}`);
  return {
    sourceId: source.sourceId,
    sourceUrl: source.url,
    cacheKey: input.cacheKey,
    schemaVersion: input.schemaVersion,
    retrievedAt: (input.retrievedAt ?? new Date()).toISOString(),
    responseHash: sha256(input.response),
    rawResponseStored: false,
    fallback: source.fallback,
  } as const;
}

type WeatherSnapshot = {
  sourceId: "open-meteo";
  location: string;
  latitude: number;
  longitude: number;
  retrievedAt: string;
  cacheHit: boolean;
  current: {
    temperatureC: number;
    windSpeedKmh: number;
    precipitationMm: number;
  };
  provenance: ReturnType<typeof createProvenanceRecord>;
};

const weatherCache = new Map<string, { expiresAt: number; snapshot: WeatherSnapshot }>();

function validCoordinate(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

export async function fetchOpenMeteoWeather(input: { location: string; latitude: number; longitude: number; cacheTtlMs?: number; timeoutMs?: number }): Promise<WeatherSnapshot> {
  if (!getOpenDataSource("open-meteo")) throw new Error("Open-Meteo source is not catalogued");
  if (!validCoordinate(input.latitude, -90, 90) || !validCoordinate(input.longitude, -180, 180)) throw new Error("Invalid weather coordinates");
  const cacheKey = `${input.location}:${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}`;
  const now = Date.now();
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return { ...cached.snapshot, cacheHit: true };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(Math.max(input.timeoutMs ?? 3_000, 500), 10_000));
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(input.latitude));
    url.searchParams.set("longitude", String(input.longitude));
    url.searchParams.set("current", "temperature_2m,wind_speed_10m,precipitation");
    url.searchParams.set("timezone", "UTC");
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const body = await response.json() as { current?: { temperature_2m?: unknown; wind_speed_10m?: unknown; precipitation?: unknown } };
    const temperatureC = Number(body.current?.temperature_2m);
    const windSpeedKmh = Number(body.current?.wind_speed_10m);
    const precipitationMm = Number(body.current?.precipitation);
    if (![temperatureC, windSpeedKmh, precipitationMm].every(Number.isFinite)) throw new Error("Open-Meteo response schema invalid");
    const retrievedAt = new Date().toISOString();
    const snapshot: WeatherSnapshot = {
      sourceId: "open-meteo",
      location: input.location.trim().slice(0, 120),
      latitude: input.latitude,
      longitude: input.longitude,
      retrievedAt,
      cacheHit: false,
      current: { temperatureC, windSpeedKmh, precipitationMm },
      provenance: createProvenanceRecord({ sourceId: "open-meteo", response: { temperatureC, windSpeedKmh, precipitationMm, retrievedAt }, schemaVersion: "open-meteo.current.v1", cacheKey }),
    };
    weatherCache.set(cacheKey, { expiresAt: now + Math.min(Math.max(input.cacheTtlMs ?? 300_000, 30_000), 900_000), snapshot });
    return snapshot;
  } catch (error) {
    if (cached) return { ...cached.snapshot, cacheHit: true };
    throw new Error(`Open-Meteo unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
  } finally {
    clearTimeout(timeout);
  }
}
