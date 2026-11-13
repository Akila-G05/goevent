-- BCrypt hashes are 60 characters long. The original dump defined this column
-- as varchar(45), which is too short to store a password hash safely.
ALTER TABLE `user`
    MODIFY COLUMN `password` VARCHAR(255) NULL;
