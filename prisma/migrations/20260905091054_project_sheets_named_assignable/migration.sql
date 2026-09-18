-- ProjectSheet: many per project, each named and assignable.

-- The unique index made one sheet per project; a plain index replaces it.
ALTER TABLE `ProjectSheet` DROP FOREIGN KEY `ProjectSheet_projectId_fkey`;
DROP INDEX `ProjectSheet_projectId_key` ON `ProjectSheet`;

-- `name` carries a default only so this can be added to a table that already
-- holds rows; the default is dropped immediately after, to match the schema.
ALTER TABLE `ProjectSheet`
    ADD COLUMN `assigneeId` VARCHAR(191) NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT 'Sheet 1',
    ADD COLUMN `position` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `ProjectSheet` ALTER COLUMN `name` DROP DEFAULT;

CREATE INDEX `ProjectSheet_projectId_idx` ON `ProjectSheet`(`projectId`);
CREATE INDEX `ProjectSheet_assigneeId_idx` ON `ProjectSheet`(`assigneeId`);

-- Re-added: dropping it above to remove the unique index would otherwise leave
-- sheets without their cascade when a project is deleted.
ALTER TABLE `ProjectSheet` ADD CONSTRAINT `ProjectSheet_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProjectSheet` ADD CONSTRAINT `ProjectSheet_assigneeId_fkey`
    FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
