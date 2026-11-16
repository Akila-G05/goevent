-- Align the shared `status` lookup with the application enum
-- (PENDING=1, APPROVED=2, REJECTED=3, DRAFT=4).
--
-- V1 seeded id 2 as 'APROVED'; correct the label without touching ids, so the
-- existing `event.event_status_id` and `request.status_id` foreign keys keep
-- pointing at the same states.
UPDATE `status` SET `name` = 'APPROVED' WHERE `id` = 2 AND `name` = 'APROVED';

-- DRAFT is inserted by V4. Repeat it defensively (no-op when it already exists)
-- so databases seeded from an older dump still expose every enum value.
INSERT IGNORE INTO `status` (`id`, `name`) VALUES (4, 'DRAFT');
