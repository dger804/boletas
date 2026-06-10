ALTER TABLE `app_users`
  MODIFY `role` ENUM('admin', 'seller', 'gate', 'regular', 'supervisor') NOT NULL DEFAULT 'regular';

UPDATE `app_users`
SET `role` = 'regular'
WHERE `role` = 'seller';

UPDATE `app_users`
SET `role` = 'supervisor'
WHERE `role` = 'gate';

ALTER TABLE `app_users`
  MODIFY `role` ENUM('regular', 'supervisor', 'admin') NOT NULL DEFAULT 'regular';
