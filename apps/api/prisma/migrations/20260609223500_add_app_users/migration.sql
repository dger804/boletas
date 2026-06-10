-- CreateTable
CREATE TABLE `app_users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'seller', 'gate') NOT NULL DEFAULT 'seller',
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_users_email_key`(`email`),
    INDEX `app_users_role_idx`(`role`),
    INDEX `app_users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
