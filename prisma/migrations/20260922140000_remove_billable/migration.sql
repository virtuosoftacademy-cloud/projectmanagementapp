-- AlterTable
ALTER TABLE `project` DROP COLUMN `defaultBillable`;

-- AlterTable
ALTER TABLE `task` DROP COLUMN `billable`;

-- AlterTable
ALTER TABLE `timeentry` DROP COLUMN `billable`;

