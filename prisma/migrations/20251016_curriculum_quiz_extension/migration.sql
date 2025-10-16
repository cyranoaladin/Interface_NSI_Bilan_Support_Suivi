-- Prisma migration: curriculum_quiz_extension (add-only)
-- Date: 2025-10-16

-- Enums
CREATE TYPE "ExerciseType" AS ENUM ('QCM','OUVERT','CODING');
CREATE TYPE "Difficulty" AS ENUM ('EASY','MEDIUM','HARD');

-- CurrTheme
CREATE TABLE "CurrTheme" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "parentId" TEXT NULL,
  CONSTRAINT "CurrTheme_parent_fkey" FOREIGN KEY ("parentId") REFERENCES "CurrTheme"("id") ON DELETE SET NULL
);
CREATE INDEX "CurrTheme_parentId_idx" ON "CurrTheme"("parentId");
CREATE INDEX "CurrTheme_order_idx" ON "CurrTheme"("order");

-- Notion
CREATE TABLE "Notion" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  CONSTRAINT "Notion_theme_fkey" FOREIGN KEY ("themeId") REFERENCES "CurrTheme"("id") ON DELETE CASCADE
);
CREATE INDEX "Notion_themeId_idx" ON "Notion"("themeId");

-- TeacherCoverage
CREATE TABLE "TeacherCoverage" (
  "id" TEXT PRIMARY KEY,
  "teacherId" TEXT NOT NULL,
  "groupId" TEXT NULL,
  "notionId" TEXT NOT NULL,
  "coveredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "durationMin" INTEGER NULL,
  "notes" TEXT NULL,
  CONSTRAINT "TeacherCoverage_notion_fkey" FOREIGN KEY ("notionId") REFERENCES "Notion"("id") ON DELETE CASCADE
);
CREATE INDEX "TeacherCoverage_teacherId_idx" ON "TeacherCoverage"("teacherId");
CREATE INDEX "TeacherCoverage_groupId_idx" ON "TeacherCoverage"("groupId");
CREATE INDEX "TeacherCoverage_notionId_coveredAt_idx" ON "TeacherCoverage"("notionId","coveredAt");

-- Resource
CREATE TABLE "Resource" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "s3Key" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "Resource_uploadedById_idx" ON "Resource"("uploadedById");
CREATE INDEX "Resource_s3Key_idx" ON "Resource"("s3Key");

-- ResourceNotion (M:N)
CREATE TABLE "ResourceNotion" (
  "resourceId" TEXT NOT NULL,
  "notionId" TEXT NOT NULL,
  PRIMARY KEY ("resourceId","notionId"),
  CONSTRAINT "ResourceNotion_resource_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE,
  CONSTRAINT "ResourceNotion_notion_fkey" FOREIGN KEY ("notionId") REFERENCES "Notion"("id") ON DELETE CASCADE
);
CREATE INDEX "ResourceNotion_notionId_idx" ON "ResourceNotion"("notionId");

-- Exercise
CREATE TABLE "Exercise" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "type" "ExerciseType" NOT NULL,
  "statementMd" TEXT NOT NULL,
  "rubricJson" JSONB NULL,
  "difficulty" "Difficulty" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "Exercise_type_idx" ON "Exercise"("type");
CREATE INDEX "Exercise_difficulty_idx" ON "Exercise"("difficulty");

-- ExerciseNotion (M:N)
CREATE TABLE "ExerciseNotion" (
  "exerciseId" TEXT NOT NULL,
  "notionId" TEXT NOT NULL,
  PRIMARY KEY ("exerciseId","notionId"),
  CONSTRAINT "ExerciseNotion_exercise_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE,
  CONSTRAINT "ExerciseNotion_notion_fkey" FOREIGN KEY ("notionId") REFERENCES "Notion"("id") ON DELETE CASCADE
);

-- Quiz
CREATE TABLE "Quiz" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NULL,
  "studentId" TEXT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "Quiz_studentId_idx" ON "Quiz"("studentId");
CREATE INDEX "Quiz_createdById_idx" ON "Quiz"("createdById");

-- QuizItem
CREATE TABLE "QuizItem" (
  "id" TEXT PRIMARY KEY,
  "quizId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  CONSTRAINT "QuizItem_quiz_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE,
  CONSTRAINT "QuizItem_exercise_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
);
CREATE INDEX "QuizItem_quizId_idx" ON "QuizItem"("quizId");
CREATE INDEX "QuizItem_exerciseId_idx" ON "QuizItem"("exerciseId");

-- QuizSubmission
CREATE TABLE "QuizSubmission" (
  "id" TEXT PRIMARY KEY,
  "quizId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "submittedAt" TIMESTAMPTZ NULL,
  CONSTRAINT "QuizSubmission_quiz_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id")
);
CREATE INDEX "QuizSubmission_quizId_idx" ON "QuizSubmission"("quizId");
CREATE INDEX "QuizSubmission_studentId_submittedAt_idx" ON "QuizSubmission"("studentId","submittedAt");

-- SubmissionItem
CREATE TABLE "SubmissionItem" (
  "id" TEXT PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "quizItemId" TEXT NOT NULL,
  "answerJson" JSONB NULL,
  "codePy" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SubmissionItem_submission_fkey" FOREIGN KEY ("submissionId") REFERENCES "QuizSubmission"("id") ON DELETE CASCADE,
  CONSTRAINT "SubmissionItem_quizItem_fkey" FOREIGN KEY ("quizItemId") REFERENCES "QuizItem"("id")
);
CREATE INDEX "SubmissionItem_submissionId_idx" ON "SubmissionItem"("submissionId");
CREATE INDEX "SubmissionItem_quizItemId_idx" ON "SubmissionItem"("quizItemId");

-- SubmissionItemGrading (1:1 SubmissionItem)
CREATE TABLE "SubmissionItemGrading" (
  "id" TEXT PRIMARY KEY,
  "submissionItemId" TEXT NOT NULL UNIQUE,
  "score" DOUBLE PRECISION NOT NULL,
  "openFeedbackJson" JSONB NULL,
  "codeReviewJson" JSONB NULL,
  "gradedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SubmissionItemGrading_item_fkey" FOREIGN KEY ("submissionItemId") REFERENCES "SubmissionItem"("id") ON DELETE CASCADE
);

-- StudentMastery
CREATE TABLE "StudentMastery" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "notionId" TEXT NOT NULL,
  "mastery" DOUBLE PRECISION NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "StudentMastery_notion_fkey" FOREIGN KEY ("notionId") REFERENCES "Notion"("id")
);
CREATE UNIQUE INDEX "StudentMastery_student_notion_uk" ON "StudentMastery"("studentId","notionId");
CREATE INDEX "StudentMastery_notionId_idx" ON "StudentMastery"("notionId");

-- DocumentNotion (link existing documents to notions)
CREATE TABLE "DocumentNotion" (
  "documentId" UUID NOT NULL,
  "notionId" TEXT NOT NULL,
  PRIMARY KEY ("documentId","notionId"),
  CONSTRAINT "DocumentNotion_document_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE,
  CONSTRAINT "DocumentNotion_notion_fkey" FOREIGN KEY ("notionId") REFERENCES "Notion"("id") ON DELETE CASCADE
);
CREATE INDEX "DocumentNotion_notionId_idx" ON "DocumentNotion"("notionId");
