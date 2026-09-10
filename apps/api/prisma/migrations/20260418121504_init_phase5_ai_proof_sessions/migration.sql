-- CreateEnum
CREATE TYPE "ProofSessionStatus" AS ENUM ('in_progress', 'completed');

-- CreateTable
CREATE TABLE "ProofSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID,
    "careerId" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "status" "ProofSessionStatus" NOT NULL DEFAULT 'in_progress',
    "questionSource" TEXT NOT NULL,
    "scoringSource" TEXT,
    "questionSetVersion" TEXT NOT NULL,
    "questionSetJson" JSONB NOT NULL,
    "answerSetJson" JSONB,
    "resultJson" JSONB,
    "overallScore" INTEGER,
    "points" INTEGER,
    "readinessBand" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofSession_userId_createdAt_idx" ON "ProofSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProofSession_careerId_createdAt_idx" ON "ProofSession"("careerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProofSession_studentProfileId_createdAt_idx" ON "ProofSession"("studentProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProofSession" ADD CONSTRAINT "ProofSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSession" ADD CONSTRAINT "ProofSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSession" ADD CONSTRAINT "ProofSession_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofSession" ADD CONSTRAINT "ProofSession_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
