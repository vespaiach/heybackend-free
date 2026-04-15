/*
  Warnings:

  - You are about to drop the column `browser` on the `Subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `deviceType` on the `Subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `os` on the `Subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `Subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `Subscriber` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Subscriber` DROP COLUMN `browser`,
    DROP COLUMN `city`,
    DROP COLUMN `country`,
    DROP COLUMN `deviceType`,
    DROP COLUMN `metadata`,
    DROP COLUMN `os`,
    DROP COLUMN `region`,
    DROP COLUMN `timezone`;

-- CreateTable
CREATE TABLE `SubscriptionRequest` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `websiteId` VARCHAR(191) NOT NULL,
    `type` ENUM('SUBSCRIBE', 'UNSUBSCRIBE') NOT NULL,
    `status` ENUM('ACCEPTED', 'REJECTED') NOT NULL,
    `rejectionReason` ENUM('VALIDATION_ERROR', 'INVALID_TOKEN', 'RATE_LIMIT_IP', 'RATE_LIMIT_WEBSITE', 'HONEYPOT') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `country` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NULL,
    `browser` VARCHAR(191) NULL,
    `deviceType` VARCHAR(191) NULL,

    INDEX `SubscriptionRequest_websiteId_idx`(`websiteId`),
    INDEX `SubscriptionRequest_email_websiteId_idx`(`email`, `websiteId`),
    INDEX `SubscriptionRequest_createdAt_idx`(`createdAt`),
    INDEX `SubscriptionRequest_type_status_websiteId_idx`(`type`, `status`, `websiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SubscriptionRequest` ADD CONSTRAINT `SubscriptionRequest_websiteId_fkey` FOREIGN KEY (`websiteId`) REFERENCES `Website`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
