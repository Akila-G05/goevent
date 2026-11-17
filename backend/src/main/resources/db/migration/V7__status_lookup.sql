-- Align the shared `status` lookup with the application enum
-- (PENDING=1, APPROVED=2, REJECTED=3, DRAFT=4).
--
-- V1 seeded id 2 as 'APROVED'; correct the label without touching ids, so the
-- existing `event.event_status_id` and `request.status_id` foreign keys keep
-- pointing at the same states.
UPDATE `status` SET `name` = 'APPROVED' WHERE `id` = 2 AND `name` = 'APROVED';

-- V4 already inserts DRAFT; no duplicate insert or status-ID rewrite is needed.
