// Simple in-memory test state shared across API routes (Node runtime)
const holds = new Map<string, number>();

export function setHold(id: string, ms: number) {
  try { holds.set(String(id), Date.now() + Math.max(0, Number(ms || 0))); } catch {}
}

export function shouldHold(id: string): boolean {
  try {
    const until = holds.get(String(id)) || 0;
    if (until > Date.now()) return true;
    // auto-clean once expired
    if (until) holds.delete(String(id));
    return false;
  } catch { return false; }
}