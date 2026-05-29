-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `venue` VARCHAR(160) NOT NULL,
    `status` ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'draft',
    `expected_attendees` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `distributors` (
    `id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `email` VARCHAR(160) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `distributors_event_id_idx`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `price` INTEGER NOT NULL,
    `status` ENUM('available', 'assigned', 'reserved', 'sold', 'paid', 'used', 'void') NOT NULL DEFAULT 'available',
    `distributor_id` VARCHAR(36) NULL,
    `recipient_name` VARCHAR(120) NULL,
    `buyer_name` VARCHAR(120) NULL,
    `buyer_phone` VARCHAR(40) NULL,
    `payment_method` ENUM('transfer', 'cash') NULL,
    `sold_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `used_at` DATETIME(3) NULL,
    `checked_in_by` VARCHAR(120) NULL,
    `capitalization_amount` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tickets_distributor_id_idx`(`distributor_id`),
    INDEX `tickets_status_idx`(`status`),
    UNIQUE INDEX `tickets_event_id_code_key`(`event_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_evidences` (
    `id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NOT NULL,
    `ticket_id` VARCHAR(36) NOT NULL,
    `method` ENUM('transfer', 'cash') NOT NULL,
    `amount` INTEGER NOT NULL,
    `capitalization_amount` INTEGER NOT NULL DEFAULT 0,
    `evidence_url` VARCHAR(500) NULL,
    `reference` VARCHAR(120) NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payment_evidences_event_id_idx`(`event_id`),
    INDEX `payment_evidences_ticket_id_idx`(`ticket_id`),
    INDEX `payment_evidences_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NULL,
    `entity_type` VARCHAR(60) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `from_status` VARCHAR(40) NULL,
    `to_status` VARCHAR(40) NULL,
    `actor` VARCHAR(120) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_event_id_idx`(`event_id`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `distributors` ADD CONSTRAINT `distributors_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_distributor_id_fkey` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_evidences` ADD CONSTRAINT `payment_evidences_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_evidences` ADD CONSTRAINT `payment_evidences_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
