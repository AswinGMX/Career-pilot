-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('draft', 'in_review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ProgramVersionState" AS ENUM ('draft', 'in_review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ContentGenerationSource" AS ENUM ('ai', 'human', 'hybrid');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('lesson', 'scenario', 'task', 'reflection');

-- CreateEnum
CREATE TYPE "ContentBlockKind" AS ENUM ('text', 'video', 'audio', 'panorama360', 'scenario', 'task_prompt');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('video', 'audio', 'panorama360', 'image');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('uploaded', 'transcoding', 'ready', 'failed');

-- CreateTable
CREATE TABLE "ExperienceProgram" (
    "id" UUID NOT NULL,
    "careerId" UUID,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "ProgramStatus" NOT NULL DEFAULT 'draft',
    "currentPublishedVersionId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramVersion" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "state" "ProgramVersionState" NOT NULL DEFAULT 'draft',
    "durationDays" INTEGER NOT NULL,
    "generationSource" "ContentGenerationSource" NOT NULL DEFAULT 'ai',
    "promptVersion" TEXT,
    "changelog" TEXT,
    "reviewedByUserId" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramDay" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "estimatedMinutes" INTEGER,

    CONSTRAINT "ProgramDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" UUID NOT NULL,
    "programDayId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ModuleType" NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "ContentBlockKind" NOT NULL,
    "bodyJson" JSONB,
    "mediaAssetId" UUID,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" UUID NOT NULL,
    "contentBlockId" UUID NOT NULL,
    "graphJson" JSONB NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "dimensionsJson" JSONB NOT NULL,
    "scaleJson" JSONB NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'uploaded',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "bytes" INTEGER,
    "durationSec" INTEGER,
    "renditionsJson" JSONB,
    "captionsKey" TEXT,
    "licenseJson" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceProgram_slug_key" ON "ExperienceProgram"("slug");

-- CreateIndex
CREATE INDEX "ExperienceProgram_status_idx" ON "ExperienceProgram"("status");

-- CreateIndex
CREATE INDEX "ExperienceProgram_careerId_idx" ON "ExperienceProgram"("careerId");

-- CreateIndex
CREATE INDEX "ProgramVersion_programId_state_idx" ON "ProgramVersion"("programId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramVersion_programId_version_key" ON "ProgramVersion"("programId", "version");

-- CreateIndex
CREATE INDEX "ProgramDay_programVersionId_idx" ON "ProgramDay"("programVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramDay_programVersionId_dayIndex_key" ON "ProgramDay"("programVersionId", "dayIndex");

-- CreateIndex
CREATE INDEX "Module_programDayId_idx" ON "Module"("programDayId");

-- CreateIndex
CREATE INDEX "ContentBlock_moduleId_idx" ON "ContentBlock"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_contentBlockId_key" ON "Scenario"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "Rubric_programVersionId_key" ON "Rubric"("programVersionId");

-- CreateIndex
CREATE INDEX "MediaAsset_tenantId_kind_idx" ON "MediaAsset"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "MediaAsset_status_idx" ON "MediaAsset"("status");

-- AddForeignKey
ALTER TABLE "ExperienceProgram" ADD CONSTRAINT "ExperienceProgram_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersion" ADD CONSTRAINT "ProgramVersion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ExperienceProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDay" ADD CONSTRAINT "ProgramDay_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "ProgramDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
