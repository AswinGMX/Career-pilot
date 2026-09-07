-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" UUID NOT NULL,
    "mentorRequestId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorMessage_mentorRequestId_createdAt_idx" ON "MentorMessage"("mentorRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_mentorRequestId_fkey" FOREIGN KEY ("mentorRequestId") REFERENCES "MentorRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
