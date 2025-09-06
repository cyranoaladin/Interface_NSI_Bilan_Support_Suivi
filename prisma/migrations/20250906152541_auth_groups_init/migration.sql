-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherOnGroup" (
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'teacher',

    CONSTRAINT "TeacherOnGroup_pkey" PRIMARY KEY ("teacherId","groupId")
);

-- CreateTable
CREATE TABLE "Bilan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "matiere" TEXT,
    "niveau" TEXT,
    "qcmRawAnswers" JSONB,
    "pedagoRawAnswers" JSONB,
    "qcmScores" JSONB,
    "pedagoProfile" JSONB,
    "preAnalyzedData" JSONB,
    "reportText" TEXT,
    "summaryText" TEXT,
    "generatedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "variant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bilan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfileData" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "pedagoRawAnswers" JSONB,
    "pedagoProfile" JSONB,
    "preAnalyzedData" JSONB,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProfileData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");

-- CreateIndex
CREATE INDEX "Group_academicYear_idx" ON "Group"("academicYear");

-- CreateIndex
CREATE INDEX "TeacherOnGroup_groupId_idx" ON "TeacherOnGroup"("groupId");

-- CreateIndex
CREATE INDEX "Bilan_userId_idx" ON "Bilan"("userId");

-- CreateIndex
CREATE INDEX "Bilan_studentId_idx" ON "Bilan"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfileData_studentId_key" ON "StudentProfileData"("studentId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherOnGroup" ADD CONSTRAINT "TeacherOnGroup_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherOnGroup" ADD CONSTRAINT "TeacherOnGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bilan" ADD CONSTRAINT "Bilan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bilan" ADD CONSTRAINT "Bilan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfileData" ADD CONSTRAINT "StudentProfileData_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
