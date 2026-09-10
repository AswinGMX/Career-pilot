-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'completed', 'paused', 'expired', 'abandoned');

-- CreateEnum
CREATE TYPE "DayState" AS ENUM ('locked', 'available', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "BlockProgressState" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'in_app');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed', 'read');

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID,
    "programId" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
    "scheduleJson" JSONB,
    "currentDayIndex" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayProgress" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "state" "DayState" NOT NULL DEFAULT 'locked',
    "unlocksAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DayProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockProgress" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "contentBlockId" UUID NOT NULL,
    "state" "BlockProgressState" NOT NULL DEFAULT 'not_started',
    "interactionJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "payloadJson" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Enrollment_userId_status_idx" ON "Enrollment"("userId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_programId_idx" ON "Enrollment"("programId");

-- CreateIndex
CREATE INDEX "DayProgress_enrollmentId_dayIndex_idx" ON "DayProgress"("enrollmentId", "dayIndex");

-- CreateIndex
CREATE UNIQUE INDEX "DayProgress_enrollmentId_dayIndex_key" ON "DayProgress"("enrollmentId", "dayIndex");

-- CreateIndex
CREATE INDEX "BlockProgress_enrollmentId_idx" ON "BlockProgress"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockProgress_enrollmentId_contentBlockId_key" ON "BlockProgress"("enrollmentId", "contentBlockId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ExperienceProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayProgress" ADD CONSTRAINT "DayProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockProgress" ADD CONSTRAINT "BlockProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
