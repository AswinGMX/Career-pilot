-- CreateEnum
CREATE TYPE "ProfileCompletionStatus" AS ENUM ('draft', 'submitted');

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID,
    "gradeLevel" TEXT,
    "ageBand" TEXT,
    "favoriteSubjects" JSONB,
    "favoriteActivities" JSONB,
    "topicsCuriousAbout" JSONB,
    "personalStrengths" JSONB,
    "avoidsOrDislikes" JSONB,
    "completionStatus" "ProfileCompletionStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileVersion" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_tenantId_idx" ON "StudentProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ProfileVersion_studentProfileId_createdAt_idx" ON "ProfileVersion"("studentProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVersion" ADD CONSTRAINT "ProfileVersion_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
