-- AlterTable
ALTER TABLE `subtask` ADD COLUMN `description` TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `task` ADD COLUMN `coverKey` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `taskattachment` ADD COLUMN `subtaskId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `TaskAttachment_subtaskId_idx` ON `TaskAttachment`(`subtaskId`);

-- AddForeignKey
ALTER TABLE `TaskAttachment` ADD CONSTRAINT `TaskAttachment_subtaskId_fkey` FOREIGN KEY (`subtaskId`) REFERENCES `Subtask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

