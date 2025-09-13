import client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

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
  }
};

export default metrics;
