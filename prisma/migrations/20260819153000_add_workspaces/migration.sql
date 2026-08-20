-- CreateTable
CREATE TABLE `Workspace` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Workspace_slug_key`(`slug`),
    INDEX `Workspace_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkspaceMember` (
    `workspaceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER', 'GUEST') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WorkspaceMember_userId_idx`(`userId`),
    PRIMARY KEY (`workspaceId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DropIndex (global team-slug uniqueness is replaced by a per-workspace one below)
DROP INDEX `Team_slug_key` ON `team`;

-- Seed the two workspaces that existing demo data backfills into. `seed.ts`
-- matches on these exact slugs on its next run and reuses these rows.
INSERT INTO `Workspace` (`id`, `name`, `slug`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('seed-ws-acme', 'Acme Corp', 'acme', 'Main workspace for all projects', NOW(3), NOW(3)),
  ('seed-ws-globex', 'Globex Inc', 'globex', 'Globex Inc''s workspace', NOW(3), NOW(3));

-- AlterTable: add the new columns nullable first, so existing rows can be
-- backfilled before the NOT NULL constraint lands.
ALTER TABLE `activityentry` ADD COLUMN `workspaceId` VARCHAR(191) NULL;
ALTER TABLE `message` ADD COLUMN `workspaceId` VARCHAR(191) NULL;
ALTER TABLE `project` ADD COLUMN `workspaceId` VARCHAR(191) NULL;
ALTER TABLE `team` ADD COLUMN `workspaceId` VARCHAR(191) NULL;

-- Backfill: the existing `engineering` team belongs to acme, `design-studio`
-- to globex, matching the new two-workspace seed data.
UPDATE `team` SET `workspaceId` = 'seed-ws-acme' WHERE `slug` = 'engineering';
UPDATE `team` SET `workspaceId` = 'seed-ws-globex' WHERE `slug` = 'design-studio';
-- Any other existing team (unexpected, but safe) defaults to acme.
UPDATE `team` SET `workspaceId` = 'seed-ws-acme' WHERE `workspaceId` IS NULL;

-- Backfill: a project's workspace follows its team's workspace.
UPDATE `project` p
  INNER JOIN `team` t ON p.`teamId` = t.`id`
  SET p.`workspaceId` = t.`workspaceId`;
-- Teamless projects (none today, but safe) default to acme.
UPDATE `project` SET `workspaceId` = 'seed-ws-acme' WHERE `workspaceId` IS NULL;

-- Backfill: existing activity/message rows are about to be wiped and
-- recreated by `seed.ts` regardless, so the exact value only needs to
-- satisfy the NOT NULL constraint for the moment in between.
UPDATE `activityentry` SET `workspaceId` = 'seed-ws-acme' WHERE `workspaceId` IS NULL;
UPDATE `message` SET `workspaceId` = 'seed-ws-acme' WHERE `workspaceId` IS NULL;

-- AlterTable: every row now has a value, so the columns can go NOT NULL.
ALTER TABLE `activityentry` MODIFY `workspaceId` VARCHAR(191) NOT NULL;
ALTER TABLE `message` MODIFY `workspaceId` VARCHAR(191) NOT NULL;
ALTER TABLE `project` MODIFY `workspaceId` VARCHAR(191) NOT NULL;
ALTER TABLE `team` MODIFY `workspaceId` VARCHAR(191) NOT NULL;

-- AlterTable: role moves off User onto WorkspaceMember.
ALTER TABLE `user` DROP COLUMN `role`,
    ADD COLUMN `lastWorkspaceId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ActivityEntry_workspaceId_idx` ON `ActivityEntry`(`workspaceId`);

-- CreateIndex
CREATE INDEX `Message_workspaceId_idx` ON `Message`(`workspaceId`);

-- CreateIndex
CREATE INDEX `Project_workspaceId_idx` ON `Project`(`workspaceId`);

-- CreateIndex
CREATE INDEX `Team_workspaceId_idx` ON `Team`(`workspaceId`);

-- CreateIndex
CREATE UNIQUE INDEX `Team_workspaceId_slug_key` ON `Team`(`workspaceId`, `slug`);

-- CreateIndex
CREATE INDEX `User_lastWorkspaceId_idx` ON `User`(`lastWorkspaceId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_lastWorkspaceId_fkey` FOREIGN KEY (`lastWorkspaceId`) REFERENCES `Workspace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkspaceMember` ADD CONSTRAINT `WorkspaceMember_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkspaceMember` ADD CONSTRAINT `WorkspaceMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityEntry` ADD CONSTRAINT `ActivityEntry_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
