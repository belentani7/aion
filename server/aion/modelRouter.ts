export type LocalModelRoute = {
  kind: string;
  fallback: boolean;
  provider: string | null;
};

/**
 * Registry of local model providers keyed by capability.
 *
 * Intentionally empty: the AION core ships with no local provider enabled, so
 * every request resolves to an explicit fallback instead of silently reaching
 * an external provider.
 */
const LOCAL_PROVIDERS: Record<string, string> = {};

export async function routeLocalModel(capability: string): Promise<LocalModelRoute> {
  const provider = LOCAL_PROVIDERS[capability] ?? null;
  if (!provider) {
    return { kind: capability, fallback: true, provider: null };
  }
  return { kind: capability, fallback: false, provider };
}
