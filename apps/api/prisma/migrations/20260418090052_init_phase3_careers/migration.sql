-- CreateEnum
CREATE TYPE "CareerStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateTable
CREATE TABLE "CareerCategory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Career" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "CareerStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Career_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerDetail" (
    "id" UUID NOT NULL,
    "careerId" UUID NOT NULL,
    "educationPath" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "positives" JSONB NOT NULL,
    "challenges" JSONB NOT NULL,
    "drawbacks" JSONB NOT NULL,
    "salaryMeta" JSONB NOT NULL,
    "outlookMeta" JSONB NOT NULL,
    "resilienceMeta" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareerCategory_slug_key" ON "CareerCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Career_slug_key" ON "Career"("slug");

-- CreateIndex
CREATE INDEX "Career_categoryId_status_idx" ON "Career"("categoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CareerDetail_careerId_key" ON "CareerDetail"("careerId");

-- AddForeignKey
ALTER TABLE "Career" ADD CONSTRAINT "Career_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CareerCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerDetail" ADD CONSTRAINT "CareerDetail_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career"("id") ON DELETE CASCADE ON UPDATE CASCADE;
