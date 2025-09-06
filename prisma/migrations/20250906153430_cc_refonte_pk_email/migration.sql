/*
  Warnings:

  - You are about to drop the column `studentId` on the `Attempt` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `Bilan` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Bilan` table. All the data in the column will be lost.
  - The primary key for the `Student` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `StudentProfileData` table. All the data in the column will be lost.
  - The primary key for the `Teacher` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `familyName` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `givenName` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Teacher` table. All the data in the column will be lost.
  - The primary key for the `TeacherOnGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `teacherId` on the `TeacherOnGroup` table. All the data in the column will be lost.
  - You are about to drop the `PasswordReset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentEmail]` on the table `StudentProfileData` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `studentEmail` to the `Attempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorEmail` to the `Bilan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorRole` to the `Bilan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentEmail` to the `StudentProfileData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherEmail` to the `TeacherOnGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Bilan" DROP CONSTRAINT "Bilan_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Bilan" DROP CONSTRAINT "Bilan_userId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordReset" DROP CONSTRAINT "PasswordReset_userId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudentProfileData" DROP CONSTRAINT "StudentProfileData_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherOnGroup" DROP CONSTRAINT "TeacherOnGroup_teacherId_fkey";

-- DropIndex
DROP INDEX "Attempt_studentId_idx";

-- DropIndex
DROP INDEX "Bilan_studentId_idx";

-- DropIndex
DROP INDEX "Bilan_userId_idx";

-- DropIndex
DROP INDEX "Student_email_key";

-- DropIndex
DROP INDEX "Student_userId_key";

-- DropIndex
DROP INDEX "StudentProfileData_studentId_key";

-- DropIndex
DROP INDEX "Teacher_email_key";

-- DropIndex
DROP INDEX "Teacher_userId_key";

-- AlterTable (Attempt): add new columns first, backfill, then drop old
ALTER TABLE "Attempt"
  ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "studentEmail" TEXT;
UPDATE "Attempt" a SET "studentEmail" = s."email"
FROM "Student" s
WHERE a."studentId" = s."id";
ALTER TABLE "Attempt" ALTER COLUMN "studentEmail" SET NOT NULL;
ALTER TABLE "Attempt" DROP COLUMN "studentId";

ALTER TABLE "Bilan"
  DROP COLUMN "studentId",
  DROP COLUMN "userId",
  ADD COLUMN     "authorEmail" TEXT NOT NULL DEFAULT '',
  ADD COLUMN     "authorRole" TEXT NOT NULL DEFAULT 'teacher',
  ADD COLUMN     "studentEmail" TEXT;

-- Backfill StudentProfileData BEFORE dropping Student.id
ALTER TABLE "StudentProfileData"
  ADD COLUMN "studentEmail" TEXT;
UPDATE "StudentProfileData" sp
SET "studentEmail" = s."email"
FROM "Student" s
WHERE sp."studentId" = s."id";
ALTER TABLE "StudentProfileData" ALTER COLUMN "studentEmail" SET NOT NULL;
ALTER TABLE "StudentProfileData" DROP COLUMN "studentId";

-- Now change Student PK to email and add auth columns
ALTER TABLE "Student"
  DROP CONSTRAINT "Student_pkey",
  DROP COLUMN "id",
  DROP COLUMN "userId",
  ADD COLUMN "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '',
  ADD CONSTRAINT "Student_pkey" PRIMARY KEY ("email");

-- Backfill TeacherOnGroup BEFORE dropping Teacher.id
ALTER TABLE "TeacherOnGroup"
  ADD COLUMN "teacherEmail" TEXT;
UPDATE "TeacherOnGroup" tg
SET "teacherEmail" = t."email"
FROM "Teacher" t
WHERE tg."teacherId" = t."id";
ALTER TABLE "TeacherOnGroup" ALTER COLUMN "teacherEmail" SET NOT NULL;
ALTER TABLE "TeacherOnGroup" DROP CONSTRAINT "TeacherOnGroup_pkey";
ALTER TABLE "TeacherOnGroup" DROP COLUMN "teacherId";
ALTER TABLE "TeacherOnGroup" ADD CONSTRAINT "TeacherOnGroup_pkey" PRIMARY KEY ("teacherEmail", "groupId");

-- Now alter Teacher table (drop id after backfill)
ALTER TABLE "Teacher"
  DROP CONSTRAINT "Teacher_pkey",
  DROP COLUMN "familyName",
  DROP COLUMN "givenName",
  DROP COLUMN "id",
  DROP COLUMN "userId",
  ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '',
  ADD CONSTRAINT "Teacher_pkey" PRIMARY KEY ("email");

-- DropTable
DROP TABLE "PasswordReset";

-- DropTable
DROP TABLE "User";

-- CreateIndex
CREATE INDEX "Attempt_studentEmail_idx" ON "Attempt"("studentEmail");

-- CreateIndex
CREATE INDEX "Bilan_authorEmail_idx" ON "Bilan"("authorEmail");

-- CreateIndex
CREATE INDEX "Bilan_studentEmail_idx" ON "Bilan"("studentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfileData_studentEmail_key" ON "StudentProfileData"("studentEmail");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "Student"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherOnGroup" ADD CONSTRAINT "TeacherOnGroup_teacherEmail_fkey" FOREIGN KEY ("teacherEmail") REFERENCES "Teacher"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bilan" ADD CONSTRAINT "Bilan_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "Student"("email") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfileData" ADD CONSTRAINT "StudentProfileData_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "Student"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
