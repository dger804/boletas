ALTER TABLE `distributors` ADD COLUMN `user_id` VARCHAR(36) NULL;

CREATE INDEX `distributors_user_id_idx` ON `distributors`(`user_id`);

ALTER TABLE `distributors` ADD CONSTRAINT `distributors_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
