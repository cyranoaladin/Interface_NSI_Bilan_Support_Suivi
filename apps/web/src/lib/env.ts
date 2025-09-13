import { z } from 'zod';
const EnvSchema = z.object({
  OPENAI_API_KEY: z.preprocess((v) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v), z.string().min(10).optional()),
  // Embeddings provider config
  EMBEDDING_PROVIDER: z.enum(['hf', 'gemini']).default('hf'),
  HF_TOKEN: z.preprocess((v) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v), z.string().min(10).optional()),
  GEMINI_API_KEY: z.preprocess((v) => (typeof v === 'string' && v.trim().length === 0 ? undefined : v), z.string().min(10).optional()),
  GEMINI_EMBEDDINGS_MODEL: z.string().default('text-embedding-004'),
  VECTOR_DIM: z.coerce.number().default(768),

  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string().default('reports'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.string().optional(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
  MAGIC_LINK_FROM: z.string().email(),
  JWT_SECRET: z.string().min(20),
}).superRefine((obj, ctx) => {
  // Exiger au moins une clé LLM (OpenAI ou Gemini) pour la génération
  if (!obj.OPENAI_API_KEY && !obj.GEMINI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either OPENAI_API_KEY or GEMINI_API_KEY must be set',
      path: ['OPENAI_API_KEY'],
    });
  }
  // Exiger clé embeddings selon provider pour RAG
  if (obj.EMBEDDING_PROVIDER === 'hf' && !obj.HF_TOKEN) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'HF_TOKEN is required when EMBEDDING_PROVIDER=hf', path: ['HF_TOKEN'] });
  }
  if (obj.EMBEDDING_PROVIDER === 'gemini' && !obj.GEMINI_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'GEMINI_API_KEY is required when EMBEDDING_PROVIDER=gemini', path: ['GEMINI_API_KEY'] });
  }
});
// During Next.js production build, avoid hard-failing on env validation.
// Use SKIP_ENV_VALIDATION=1 to bypass Zod parsing at build-time.
const SKIP = process.env.SKIP_ENV_VALIDATION === '1' || process.env.NEXT_PHASE === 'phase-production-build';
export const env: any = SKIP
  ? new Proxy({}, { get: (_t, p: string | symbol) => process.env[String(p)] })
  : EnvSchema.parse(process.env);
