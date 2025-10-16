import { Worker, Queue } from "bullmq";

const connection = process.env.REDIS_URL || "redis://redis:6379";

export const qIngest = new Queue("ingest-doc", { connection });
export const qExec   = new Queue("execute-tests", { connection });
export const qGrade  = new Queue("grade-submission", { connection });

// Processors (stubs)
if (process.env.FEATURE_RAG === "1") {
  new Worker("ingest-doc", async (job) => {
    // TODO: récupérer resourceId, analyser document_chunks (GEMINI-768),
    // proposer des notions (cosine) et écrire DocumentNotion
    return { ok: true };
  }, { connection });
}

if (process.env.FEATURE_QUIZ === "1") {
  new Worker("execute-tests", async (job) => {
    // TODO: appeler PY_RUNNER_URL avec code + tests, calculer score
    return { passed: 0, total: 0 };
  }, { connection });

  new Worker("grade-submission", async (job) => {
    // TODO: agrégations + LLM pour OUVERT, mise à jour StudentMastery
    return { ok: true };
  }, { connection });
}
