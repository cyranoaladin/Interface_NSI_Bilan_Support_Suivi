-- Add 'order' column to Notion (add-only)
ALTER TABLE "Notion" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Notion_themeId_idx" ON "Notion"("themeId");
