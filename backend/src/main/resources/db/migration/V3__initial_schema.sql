-- Incremental profile schema update after V1 and V2; no sample data or
-- database selection. Flyway uses the externally configured schema.
ALTER TABLE `user`
    ADD COLUMN `mobile` VARCHAR(15) NULL;

-- Older student records have no university assignment. Keep them intact;
-- profile completion supplies a valid university rather than inventing one.
ALTER TABLE `student_detail`
    ADD COLUMN `university_id` INT NULL,
    ADD INDEX `fk_student_detail_university1_idx` (`university_id`),
    ADD CONSTRAINT `fk_student_detail_university1`
        FOREIGN KEY (`university_id`) REFERENCES `university` (`id`);
