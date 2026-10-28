// Rate limiting em memória — por instância serverless (Vercel).
// Não é global: em escala alta trocar por Upstash/Redis. Protege os
// endpoints sensíveis (auth, portal) contra brute force básico.
const buckets = new Map<string, number[]>();

// Limpa janelas antigas para não crescer indefinidamente.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, ts] of buckets) {
    const fresh = ts.filter((t) => now - t < 15 * 60_000);
    if (fresh.length === 0) buckets.delete(k);
    else buckets.set(k, fresh);
  }
}

/** Retorna true se dentro do limite; false se estourou. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  sweep();
  const now = Date.now();
  const ts = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (ts.length >= limit) {
    buckets.set(key, ts);
    return false;
  }
  ts.push(now);
  buckets.set(key, ts);
  return true;
}
