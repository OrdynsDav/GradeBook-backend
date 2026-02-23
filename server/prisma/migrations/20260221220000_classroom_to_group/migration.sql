-- ClassRoom -> Group: rename table and add curator
ALTER TABLE "ClassRoom" RENAME TO "Group";
ALTER TABLE "Group" ADD COLUMN "curatorId" TEXT;
ALTER TABLE "Group" ADD CONSTRAINT "Group_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename columns (FK constraints keep working)
ALTER TABLE "User" RENAME COLUMN "classRoomId" TO "groupId";
ALTER TABLE "Subject" RENAME COLUMN "classRoomId" TO "groupId";
ALTER TABLE "Lesson" RENAME COLUMN "classRoomId" TO "groupId";

-- Recreate indexes that reference old column names (drop old, create new)
DROP INDEX IF EXISTS "ClassRoom_course_groupName_key";
CREATE UNIQUE INDEX "Group_course_groupName_key" ON "Group"("course", "groupName");

DROP INDEX IF EXISTS "User_classRoomId_role_idx";
CREATE INDEX "User_groupId_role_idx" ON "User"("groupId", "role");

DROP INDEX IF EXISTS "Subject_classRoomId_idx";
CREATE INDEX "Subject_groupId_idx" ON "Subject"("groupId");

DROP INDEX IF EXISTS "Subject_name_classRoomId_key";
CREATE UNIQUE INDEX "Subject_name_groupId_key" ON "Subject"("name", "groupId");

DROP INDEX IF EXISTS "Lesson_classRoomId_startsAt_idx";
CREATE INDEX "Lesson_groupId_startsAt_idx" ON "Lesson"("groupId", "startsAt");
