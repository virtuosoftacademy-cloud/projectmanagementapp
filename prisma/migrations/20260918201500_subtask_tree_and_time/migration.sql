-- Subtasks become a tree with a status and their own time.
--
-- Hand-edited from `prisma migrate diff`: the generated script dropped `done`
-- in the same statement that added `status`, which would have reset every
-- ticked subtask to TODO. Here `status` is added first, filled from `done`,
-- and only then is `done` dropped.

-- AlterTable
ALTER TABLE `subtask`
    ADD COLUMN `estimateMinutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `parentId` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE') NOT NULL DEFAULT 'TODO';

-- Carry the old checkbox over: ticked means DONE, everything else stays TODO.
UPDATE `subtask` SET `status` = 'DONE' WHERE `done` = 1;

ALTER TABLE `subtask` DROP COLUMN `done`;

-- AlterTable
ALTER TABLE `tasktimer` ADD COLUMN `subtaskId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `timeentry` ADD COLUMN `subtaskId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Subtask_parentId_idx` ON `Subtask`(`parentId`);

-- CreateIndex
CREATE INDEX `TaskTimer_subtaskId_idx` ON `TaskTimer`(`subtaskId`);

-- CreateIndex
CREATE INDEX `TimeEntry_subtaskId_idx` ON `TimeEntry`(`subtaskId`);

-- AddForeignKey
ALTER TABLE `Subtask` ADD CONSTRAINT `Subtask_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Subtask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeEntry` ADD CONSTRAINT `TimeEntry_subtaskId_fkey` FOREIGN KEY (`subtaskId`) REFERENCES `Subtask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskTimer` ADD CONSTRAINT `TaskTimer_subtaskId_fkey` FOREIGN KEY (`subtaskId`) REFERENCES `Subtask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
