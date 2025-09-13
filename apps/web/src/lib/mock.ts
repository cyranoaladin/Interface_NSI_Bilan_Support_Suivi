declare global {
  // eslint-disable-next-line no-var
  var __LLM_MOCK_URL__: string | null | undefined;
  // eslint-disable-next-line no-var
  var __LAST_LLM_PAYLOAD__: any;
}

export function getMockLlmUrl(): string | null {
  return typeof globalThis.__LLM_MOCK_URL__ === 'string' ? (globalThis.__LLM_MOCK_URL__ as string) : null;
}

export function setMockLlmUrl(url: string | null): void {
  globalThis.__LLM_MOCK_URL__ = url ?? null;
}

export function setLastLlmPayload(payload: any): void {
  globalThis.__LAST_LLM_PAYLOAD__ = payload;
}

export function getLastLlmPayload(): any {
  return globalThis.__LAST_LLM_PAYLOAD__;
}

