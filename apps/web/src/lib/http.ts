export function ok(data: unknown, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}
export function err(error: string, details?: unknown, init?: ResponseInit) {
  const status = (init as any)?.status ?? 400;
  return Response.json({ ok: false, error, details }, { ...(init || {}), status });
}
