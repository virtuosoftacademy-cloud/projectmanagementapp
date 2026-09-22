-- AlterTable
ALTER TABLE `subtask` ADD COLUMN `assigneeId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Subtask_assigneeId_idx` ON `Subtask`(`assigneeId`);

-- AddForeignKey
ALTER TABLE `Subtask` ADD CONSTRAINT `Subtask_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

