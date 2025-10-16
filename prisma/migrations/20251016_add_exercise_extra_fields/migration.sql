-- Add-only fields to Exercise for seeding minimal bac exercises
ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "solutionJson" JSONB;
ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "testsJson" JSONB;
ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "starterCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_code_key" ON "Exercise"("code");
