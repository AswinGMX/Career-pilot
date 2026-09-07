-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('pending', 'submitted', 'evaluating', 'scored', 'failed');

-- CreateTable
CREATE TABLE "EvidenceSubmission" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "contentBlockId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'pending',
    "mediaAssetId" UUID,
    "textBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceSubmission_enrollmentId_contentBlockId_idx" ON "EvidenceSubmission"("enrollmentId", "contentBlockId");

-- CreateIndex
CREATE INDEX "EvidenceSubmission_status_idx" ON "EvidenceSubmission"("status");

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
