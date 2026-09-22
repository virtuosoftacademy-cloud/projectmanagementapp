-- Owner is gone; Admin is the workspace's top, fixed role.
-- Existing owners become admins before the enum loses the value, or MySQL
-- would have nothing valid to keep them on.
UPDATE `WorkspaceMember` SET `role` = 'ADMIN' WHERE `role` = 'OWNER';
UPDATE `CustomRole` SET `inheritsFrom` = 'ADMIN' WHERE `inheritsFrom` = 'OWNER';

-- Admin is no longer one of the editable roles, so its rows go and the members
-- holding them fall back to the base role on their membership.
UPDATE `WorkspaceMember` `wm`
  JOIN `CustomRole` `r` ON `wm`.`customRoleId` = `r`.`id`
  SET `wm`.`customRoleId` = NULL
  WHERE `r`.`name` = 'admin';
DELETE FROM `CustomRole` WHERE `name` = 'admin';

-- AlterTable
ALTER TABLE `customrole` MODIFY `inheritsFrom` ENUM('ADMIN', 'MANAGER', 'MEMBER', 'VIEWER', 'GUEST') NOT NULL;

-- AlterTable
ALTER TABLE `workspacemember` MODIFY `role` ENUM('ADMIN', 'MANAGER', 'MEMBER', 'VIEWER', 'GUEST') NOT NULL DEFAULT 'MEMBER';
