-- DropIndex
DROP INDEX `TaskAttachment_cloudflareId_key` ON `taskattachment`;

-- AlterTable
ALTER TABLE `taskattachment` DROP COLUMN `cloudflareId`,
    ADD COLUMN `height` INTEGER NULL,
    ADD COLUMN `objectKey` VARCHAR(191) NOT NULL,
    ADD COLUMN `width` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `imageKey` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AppSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'app',
    `logoLightKey` VARCHAR(191) NULL,
    `logoDarkKey` VARCHAR(191) NULL,
    `faviconKey` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `TaskAttachment_objectKey_key` ON `TaskAttachment`(`objectKey`);

