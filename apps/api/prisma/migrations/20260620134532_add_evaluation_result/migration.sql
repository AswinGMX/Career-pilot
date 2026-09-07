-- CreateEnum
CREATE TYPE "EvaluationScope" AS ENUM ('block', 'day', 'final');

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "scope" "EvaluationScope" NOT NULL DEFAULT 'final',
    "rubricVersion" TEXT,
    "scoringSource" TEXT,
    "promptVersion" TEXT,
    "scoresJson" JSONB,
    "narrative" TEXT,
    "points" INTEGER,
    "readinessBand" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationResult_enrollmentId_scope_idx" ON "EvaluationResult"("enrollmentId", "scope");

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
