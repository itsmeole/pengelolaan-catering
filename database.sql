-- Database Schema for Go Catering
CREATE DATABASE IF NOT EXISTS `catering_db`;
USE `catering_db`;

SET FOREIGN_KEY_CHECKS=0;

-- Table: User
DROP TABLE IF EXISTS `User`;

CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `image` LONGTEXT NULL,
  `role` ENUM('STUDENT', 'VENDOR', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
  `nis` VARCHAR(191) NULL,
  `class` VARCHAR(191) NULL,
  `vendorName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_email_key`(`email`),
  UNIQUE INDEX `User_nis_key`(`nis`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Table: MenuItem
DROP TABLE IF EXISTS `MenuItem`;

CREATE TABLE `MenuItem` (
  `id` VARCHAR(191) NOT NULL,
  `vendorId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `price` DOUBLE NOT NULL,
  `imageUrl` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Table: StudentValidation
DROP TABLE IF EXISTS `StudentValidation`;

CREATE TABLE `StudentValidation` (
  `id` VARCHAR(191) NOT NULL,
  `nis` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `class` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `StudentValidation_nis_key`(`nis`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Table: Order
DROP TABLE IF EXISTS `Order`;

CREATE TABLE `Order` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `totalAmount` DOUBLE NOT NULL,
  `status` ENUM('PENDING', 'PAID', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paymentMethod` ENUM('CASH_PAY_LATER', 'TRANSFER') NOT NULL,
  `proofImage` LONGTEXT NULL,
  `transferDate` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Table: OrderItem
DROP TABLE IF EXISTS `OrderItem`;

CREATE TABLE `OrderItem` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `menuId` VARCHAR(191) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `note` VARCHAR(191) NULL,
  `price` DOUBLE NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Table: Review
DROP TABLE IF EXISTS `Review`;

CREATE TABLE `Review` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `orderItemId` VARCHAR(191) NOT NULL,
  `rating` INTEGER NOT NULL,
  `comment` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Review_orderItemId_key`(`orderItemId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign Keys
ALTER TABLE `MenuItem` ADD CONSTRAINT `MenuItem_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `MenuItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Review` ADD CONSTRAINT `Review_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Review` ADD CONSTRAINT `Review_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed Data

DELETE FROM `User` WHERE `email` IN ('admin@school.id', 'vendor1@catering.id', 'vendor2@catering.id');

INSERT INTO `User` (`id`, `name`, `email`, `password`, `role`, `createdAt`, `updatedAt`) VALUES
('admin-1', 'Admin Sekolah', 'admin@school.id', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', NOW(), NOW());

INSERT INTO `User` (`id`, `name`, `email`, `password`, `role`, `vendorName`, `createdAt`, `updatedAt`) VALUES
('vendor-1', 'Dapur Bunda', 'vendor1@catering.id', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'VENDOR', 'Dapur Bunda', NOW(), NOW()),
('vendor-2', 'Soto Seger', 'vendor2@catering.id', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'VENDOR', 'Soto Seger', NOW(), NOW());

INSERT INTO `StudentValidation` (`id`, `nis`, `name`, `class`) VALUES
('val-1', '12345', 'Budi Santoso', 'XII RPL 1'),
('val-2', '12346', 'Siti Aminah', 'XII RPL 2'),
('val-3', '12347', 'Ahmad Dani', 'XI TKJ 1');

INSERT INTO `MenuItem` (`id`, `vendorId`, `name`, `description`, `price`, `createdAt`, `updatedAt`) VALUES
('menu-1', 'vendor-1', 'Paket Ayam Bakar', 'Nasi, Ayam Bakar, Lalapan, Sambal', 15000, NOW(), NOW()),
('menu-2', 'vendor-1', 'Paket Lele Goreng', 'Nasi, Lele, Lalapan', 12000, NOW(), NOW());

SET FOREIGN_KEY_CHECKS=1;
