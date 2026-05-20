-- AlterTable
ALTER TABLE `Tryout` ADD COLUMN `bankSoalId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `avatarUrl` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `BankSoal` (
    `id` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `createdByTeacherId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BankSoal_subjectId_idx`(`subjectId`),
    INDEX `BankSoal_createdByTeacherId_idx`(`createdByTeacherId`),
    INDEX `BankSoal_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankSoalQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `bankSoalId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `orderNumber` INTEGER NOT NULL,

    INDEX `BankSoalQuestion_questionId_idx`(`questionId`),
    UNIQUE INDEX `BankSoalQuestion_bankSoalId_questionId_key`(`bankSoalId`, `questionId`),
    UNIQUE INDEX `BankSoalQuestion_bankSoalId_orderNumber_key`(`bankSoalId`, `orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Tryout_bankSoalId_idx` ON `Tryout`(`bankSoalId`);

-- AddForeignKey
ALTER TABLE `BankSoal` ADD CONSTRAINT `BankSoal_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankSoal` ADD CONSTRAINT `BankSoal_createdByTeacherId_fkey` FOREIGN KEY (`createdByTeacherId`) REFERENCES `TeacherProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankSoalQuestion` ADD CONSTRAINT `BankSoalQuestion_bankSoalId_fkey` FOREIGN KEY (`bankSoalId`) REFERENCES `BankSoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankSoalQuestion` ADD CONSTRAINT `BankSoalQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tryout` ADD CONSTRAINT `Tryout_bankSoalId_fkey` FOREIGN KEY (`bankSoalId`) REFERENCES `BankSoal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TryoutSession` ADD CONSTRAINT `TryoutSession_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `StudentProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
