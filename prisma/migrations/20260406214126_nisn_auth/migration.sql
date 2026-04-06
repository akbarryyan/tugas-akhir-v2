/*
  Warnings:

  - You are about to drop the column `nis` on the `StudentProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nisn]` on the table `StudentProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nisn` to the `StudentProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authMethod` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `StudentProfile_nis_key` ON `StudentProfile`;

-- AlterTable
ALTER TABLE `StudentProfile` DROP COLUMN `nis`,
    ADD COLUMN `nisn` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `authMethod` ENUM('EMAIL_PASSWORD', 'NISN') NOT NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `passwordHash` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `StudentProfile_nisn_key` ON `StudentProfile`(`nisn`);

-- CreateIndex
CREATE INDEX `User_authMethod_idx` ON `User`(`authMethod`);
