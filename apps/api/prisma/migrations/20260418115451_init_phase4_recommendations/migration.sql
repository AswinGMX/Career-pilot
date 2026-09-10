-- CreateTable
CREATE TABLE "RecommendationSnapshot" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "profileVersionCount" INTEGER NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "inputSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationSnapshot_userId_createdAt_idx" ON "RecommendationSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationSnapshot_studentProfileId_createdAt_idx" ON "RecommendationSnapshot"("studentProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecommendationSnapshot" ADD CONSTRAINT "RecommendationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSnapshot" ADD CONSTRAINT "RecommendationSnapshot_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
