import client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// LLM API latency histogram
const llmLatency = new client.Histogram({
  name: 'llm_api_latency_seconds',
  help: 'Latency of LLM API calls',
  labelNames: ['provider'] as const,
  buckets: [0.1, 0.2, 0.5, 1, 2, 3, 5, 8, 13],
});
registry.registerMetric(llmLatency);

// BullMQ Gauges for queue states
const bullmqJobs = new client.Gauge({
  name: 'bullmq_jobs',
  help: 'BullMQ jobs by queue and status',
  labelNames: ['queue', 'status'] as const,
});
registry.registerMetric(bullmqJobs);

// HTTP request metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});
registry.registerMetric(httpRequestDuration);

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});
registry.registerMetric(httpRequestTotal);

const activeRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  labelNames: ['method', 'route'] as const,
});
registry.registerMetric(activeRequests);

// Database query metrics
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
registry.registerMetric(dbQueryDuration);

// Cache metrics
const cacheOperations = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status', 'cache_type'] as const,
});
registry.registerMetric(cacheOperations);

export const metrics = {
  registry,
  observeLlmLatency(provider: 'openai' | 'gemini' | string, seconds: number) {
    try { llmLatency.labels(provider).observe(seconds); } catch {}
  },
  async collectBullmq(queueName: string, queueStats: { waiting?: number; active?: number; failed?: number; completed?: number; delayed?: number; paused?: number; }) {
    try {
      const q = queueName;
      const s = queueStats || {};
      const set = (status: string, val?: number) => { try { bullmqJobs.labels(q, status).set(Number(val || 0)); } catch {} };
      set('waiting', s.waiting);
      set('active', s.active);
      set('failed', s.failed);
      set('completed', s.completed);
      set('delayed', s.delayed);
      set('paused', s.paused);
    } catch {}
  },
  observeHttpRequestDuration(method: string, route: string, statusCode: number, seconds: number) {
    try {
      httpRequestDuration.labels(method, route, statusCode.toString()).observe(seconds);
    } catch {}
  },
  incrementHttpRequestTotal(method: string, route: string, statusCode: number) {
    try {
      httpRequestTotal.labels(method, route, statusCode.toString()).inc();
    } catch {}
  },
  incrementActiveRequest(method: string, route: string) {
    try {
      activeRequests.labels(method, route).inc();
    } catch {}
  },
  decrementActiveRequest(method: string, route: string) {
    try {
      activeRequests.labels(method, route).dec();
    } catch {}
  },
  observeDbQueryDuration(operation: string, model: string, seconds: number) {
    try {
      dbQueryDuration.labels(operation, model).observe(seconds);
    } catch {}
  },
  incrementCacheOperation(operation: string, status: string, cacheType: string) {
    try {
      cacheOperations.labels(operation, status, cacheType).inc();
    } catch {}
  },
};

export default metrics;
