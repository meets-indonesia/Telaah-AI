const FX_URL = "https://open.er-api.com/v6/latest/USD";
const TTL_MS = 60 * 60 * 1000;

let cached: { rate: number; expiresAt: number } | null = null;

export function clearFxCache(): void {
  cached = null;
}

export async function getUsdIdrRate(fetchImpl: typeof fetch = fetch): Promise<number | null> {
  if (cached && cached.expiresAt > Date.now()) return cached.rate;
  try {
    const res = await fetchImpl(FX_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data?.rates?.IDR);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    cached = { rate, expiresAt: Date.now() + TTL_MS };
    return rate;
  } catch {
    return null;
  }
}
