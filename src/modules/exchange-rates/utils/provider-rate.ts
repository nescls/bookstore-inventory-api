import { isValidRate } from "./is-valid-rate";

export function readProviderConfig() {
  const url =
    process.env.EXCHANGE_RATE_URL ??
    "https://api.exchangerate-api.com/v4/latest/USD";
  const timeoutMs = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS ?? 5000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000)
    throw new Error("Invalid EXCHANGE_RATE_TIMEOUT_MS");
  return { url, timeoutMs };
}

export async function fetchProviderRate(url: string, timeoutMs: number) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error("Provider HTTP failure");
  const payload = (await response.json()) as {
    base?: unknown;
    rates?: { EUR?: unknown };
  };
  const rate = payload?.rates?.EUR;
  if (payload?.base !== "USD" || !isValidRate(rate))
    throw new Error("Invalid provider rate");
  return rate;
}
