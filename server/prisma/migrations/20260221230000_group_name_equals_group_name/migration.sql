-- name = groupName (no course prefix); drop unique on name so (course, groupName) is the only uniqueness
DROP INDEX IF EXISTS "ClassRoom_name_key";
UPDATE "Group" SET "name" = "groupName";
