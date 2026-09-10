CREATE TYPE "ReportType" AS ENUM ('student', 'school');

CREATE TYPE "ReportStatus" AS ENUM ('queued', 'ready', 'failed');

CREATE TABLE "Report" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tenantId" UUID,
  "reportType" "ReportType" NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'queued',
  "version" TEXT NOT NULL,
  "reportJson" JSONB,
  "fileUrl" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportShare" (
  "id" UUID NOT NULL,
  "reportId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_userId_reportType_createdAt_idx" ON "Report"("userId", "reportType", "createdAt");
CREATE INDEX "Report_tenantId_reportType_createdAt_idx" ON "Report"("tenantId", "reportType", "createdAt");
CREATE INDEX "ReportShare_reportId_createdAt_idx" ON "ReportShare"("reportId", "createdAt");
CREATE INDEX "ReportShare_expiresAt_idx" ON "ReportShare"("expiresAt");

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportShare"
  ADD CONSTRAINT "ReportShare_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
