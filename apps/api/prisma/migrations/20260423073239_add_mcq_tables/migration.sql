-- CreateEnum
CREATE TYPE "McqSource" AS ENUM ('gemini', 'cache', 'fallback');

-- CreateTable
CREATE TABLE "McqSet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "studentProfileId" UUID,
    "cacheKey" TEXT NOT NULL,
    "source" "McqSource" NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "weakTopics" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McqSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McqItem" (
    "id" UUID NOT NULL,
    "setId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "stem" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "correctLetter" TEXT NOT NULL,

    CONSTRAINT "McqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McqOption" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "letter" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "McqOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McqSet_userId_createdAt_idx" ON "McqSet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "McqSet_cacheKey_createdAt_idx" ON "McqSet"("cacheKey", "createdAt");

-- CreateIndex
CREATE INDEX "McqItem_setId_idx" ON "McqItem"("setId");

-- CreateIndex
CREATE UNIQUE INDEX "McqItem_setId_orderIndex_key" ON "McqItem"("setId", "orderIndex");

-- CreateIndex
CREATE INDEX "McqOption_itemId_idx" ON "McqOption"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "McqOption_itemId_letter_key" ON "McqOption"("itemId", "letter");

-- AddForeignKey
ALTER TABLE "McqSet" ADD CONSTRAINT "McqSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McqSet" ADD CONSTRAINT "McqSet_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McqItem" ADD CONSTRAINT "McqItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "McqSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McqOption" ADD CONSTRAINT "McqOption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "McqItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
