-- Account profile fields: names, contact, locale and avatar.
--
-- Every added column is nullable with no default, which PostgreSQL 11+ applies
-- as a catalogue-only change: no table rewrite and no long lock, so this is
-- safe to run against a large `User` table while serving traffic.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarMediaId" UUID,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "locale" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "timezone" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
