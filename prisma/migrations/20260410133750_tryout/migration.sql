/*
  Warnings:

  - You are about to drop the column `subjectId` on the `TryoutSession` table. All the data in the column will be lost.
  - Added the required column `tryoutId` to the `TryoutSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `TryoutSession` DROP FOREIGN KEY `TryoutSession_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `TryoutSession` DROP FOREIGN KEY `TryoutSession_subjectId_fkey`;

-- DropIndex
DROP INDEX `TryoutSession_studentId_subjectId_idx` ON `TryoutSession`;

-- DropIndex
DROP INDEX `TryoutSession_subjectId_idx` ON `TryoutSession`;

-- AlterTable
ALTER TABLE `TryoutSession` DROP COLUMN `subjectId`,
    ADD COLUMN `tryoutId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `Tryout` (
    `id` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `createdByTeacherId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `durationMinutes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tryout_subjectId_idx`(`subjectId`),
    INDEX `Tryout_createdByTeacherId_idx`(`createdByTeacherId`),
    INDEX `Tryout_isPublished_idx`(`isPublished`),
    INDEX `Tryout_subjectId_isPublished_idx`(`subjectId`, `isPublished`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TryoutQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `tryoutId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `orderNumber` INTEGER NOT NULL,

    INDEX `TryoutQuestion_questionId_idx`(`questionId`),
    UNIQUE INDEX `TryoutQuestion_tryoutId_questionId_key`(`tryoutId`, `questionId`),
    UNIQUE INDEX `TryoutQuestion_tryoutId_orderNumber_key`(`tryoutId`, `orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TryoutSession_tryoutId_idx` ON `TryoutSession`(`tryoutId`);

-- CreateIndex
CREATE INDEX `TryoutSession_studentId_tryoutId_idx` ON `TryoutSession`(`studentId`, `tryoutId`);

-- AddForeignKey
ALTER TABLE `Tryout` ADD CONSTRAINT `Tryout_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tryout` ADD CONSTRAINT `Tryout_createdByTeacherId_fkey` FOREIGN KEY (`createdByTeacherId`) REFERENCES `TeacherProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TryoutQuestion` ADD CONSTRAINT `TryoutQuestion_tryoutId_fkey` FOREIGN KEY (`tryoutId`) REFERENCES `Tryout`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TryoutQuestion` ADD CONSTRAINT `TryoutQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TryoutSession` ADD CONSTRAINT `TryoutSession_tryoutId_fkey` FOREIGN KEY (`tryoutId`) REFERENCES `Tryout`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
