-- CreateEnum
CREATE TYPE "MentorRequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');

-- CreateEnum
CREATE TYPE "GuidancePlanStatus" AS ENUM ('draft', 'active', 'completed');

-- CreateTable
CREATE TABLE "MentorProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "expertiseJson" JSONB,
    "acceptingStudents" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorRequest" (
    "id" UUID NOT NULL,
    "mentorProfileId" UUID NOT NULL,
    "studentUserId" UUID NOT NULL,
    "status" "MentorRequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MentorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidancePlan" (
    "id" UUID NOT NULL,
    "mentorRequestId" UUID NOT NULL,
    "mentorUserId" UUID NOT NULL,
    "studentUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "notes" TEXT,
    "stepsJson" JSONB,
    "linkedCareerIdsJson" JSONB,
    "status" "GuidancePlanStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorProfile_userId_key" ON "MentorProfile"("userId");

-- CreateIndex
CREATE INDEX "MentorProfile_acceptingStudents_idx" ON "MentorProfile"("acceptingStudents");

-- CreateIndex
CREATE INDEX "MentorRequest_studentUserId_status_idx" ON "MentorRequest"("studentUserId", "status");

-- CreateIndex
CREATE INDEX "MentorRequest_mentorProfileId_status_idx" ON "MentorRequest"("mentorProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MentorRequest_mentorProfileId_studentUserId_key" ON "MentorRequest"("mentorProfileId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GuidancePlan_mentorRequestId_key" ON "GuidancePlan"("mentorRequestId");

-- CreateIndex
CREATE INDEX "GuidancePlan_studentUserId_idx" ON "GuidancePlan"("studentUserId");

-- CreateIndex
CREATE INDEX "GuidancePlan_mentorUserId_idx" ON "GuidancePlan"("mentorUserId");

-- AddForeignKey
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorRequest" ADD CONSTRAINT "MentorRequest_mentorProfileId_fkey" FOREIGN KEY ("mentorProfileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorRequest" ADD CONSTRAINT "MentorRequest_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidancePlan" ADD CONSTRAINT "GuidancePlan_mentorRequestId_fkey" FOREIGN KEY ("mentorRequestId") REFERENCES "MentorRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
