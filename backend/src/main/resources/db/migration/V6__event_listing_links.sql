-- One event can publish several links, so the single `event.link_id` column is
-- no longer the source of truth. The column stays (nullable) for the expand
-- step; new rows use `event_has_links` and a later migration can drop it.
ALTER TABLE `event`
    MODIFY COLUMN `link_id` INT NULL;

-- A listing can be created before its cover image is uploaded. Image storage
-- keeps its own validation; the column simply stops blocking creation.
ALTER TABLE `event`
    MODIFY COLUMN `img_id` INT NULL;

CREATE TABLE IF NOT EXISTS `event_has_links` (
  `event_id` int NOT NULL,
  `link_id` int NOT NULL,
  PRIMARY KEY (`event_id`, `link_id`),
  KEY `fk_event_has_links_link1_idx` (`link_id`),
  CONSTRAINT `fk_event_has_links_event1`
      FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_has_links_link1`
      FOREIGN KEY (`link_id`) REFERENCES `link` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preserve links of events created before the listing API used a join table.
INSERT INTO event_has_links(event_id,link_id)
SELECT e.id,e.link_id FROM `event` e
WHERE e.link_id IS NOT NULL AND NOT EXISTS
  (SELECT 1 FROM event_has_links existing WHERE existing.event_id=e.id AND existing.link_id=e.link_id);

-- The organizer dashboard and moderation queue filter by owner and review
-- state; the original schema had no index for that access path.
CREATE INDEX `ix_event_published_by_status`
    ON `event` (`published_by`, `event_status_id`);
