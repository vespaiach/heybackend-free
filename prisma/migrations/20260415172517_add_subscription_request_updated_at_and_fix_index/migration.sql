/*
  Warnings:

  - Added the required column `updatedAt` to the `SubscriptionRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `SubscriptionRequest_createdAt_idx` ON `SubscriptionRequest`;

-- AlterTable
ALTER TABLE `SubscriptionRequest` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `SubscriptionRequest_websiteId_createdAt_idx` ON `SubscriptionRequest`(`websiteId`, `createdAt`);
