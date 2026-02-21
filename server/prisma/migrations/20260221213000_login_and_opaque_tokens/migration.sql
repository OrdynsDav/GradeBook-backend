-- User auth identifier: email -> login
ALTER TABLE "User" ADD COLUMN "login" TEXT;
UPDATE "User" SET "login" = "email";
ALTER TABLE "User" ALTER COLUMN "login" SET NOT NULL;
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
DROP INDEX "User_email_key";
ALTER TABLE "User" DROP COLUMN "email";

-- Classroom metadata
ALTER TABLE "ClassRoom" ADD COLUMN "course" INTEGER;
ALTER TABLE "ClassRoom" ADD COLUMN "groupName" TEXT;
UPDATE "ClassRoom" SET "course" = 1, "groupName" = "name";
ALTER TABLE "ClassRoom" ALTER COLUMN "course" SET NOT NULL;
ALTER TABLE "ClassRoom" ALTER COLUMN "groupName" SET NOT NULL;
CREATE UNIQUE INDEX "ClassRoom_course_groupName_key" ON "ClassRoom"("course", "groupName");

-- Opaque access tokens in refresh sessions
ALTER TABLE "RefreshSession" ADD COLUMN "accessTokenHash" TEXT;
ALTER TABLE "RefreshSession" ADD COLUMN "accessExpiresAt" TIMESTAMP(3);
UPDATE "RefreshSession"
SET
  "accessTokenHash" = "tokenHash",
  "accessExpiresAt" = "expiresAt";
ALTER TABLE "RefreshSession" ALTER COLUMN "accessTokenHash" SET NOT NULL;
ALTER TABLE "RefreshSession" ALTER COLUMN "accessExpiresAt" SET NOT NULL;
CREATE UNIQUE INDEX "RefreshSession_accessTokenHash_key" ON "RefreshSession"("accessTokenHash");
CREATE INDEX "RefreshSession_accessExpiresAt_revokedAt_idx" ON "RefreshSession"("accessExpiresAt", "revokedAt");
