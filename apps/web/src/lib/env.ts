import { z } from 'zod';
const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(10),
  // Embeddings provider config
  EMBEDDING_PROVIDER: z.enum(['hf', 'gemini']).default('hf'),
  HF_TOKEN: z.string().min(10).optional(),
  GEMINI_API_KEY: z.string().min(10).optional(),
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
});
export const env = EnvSchema.parse(process.env);
