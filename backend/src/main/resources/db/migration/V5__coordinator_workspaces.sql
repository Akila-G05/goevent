-- Preserve V4 current-assignment ordering. Older organization links remain revoked.
ALTER TABLE user_has_organize
    ADD COLUMN access_state VARCHAR(16) NOT NULL DEFAULT 'REVOKED',
    ADD COLUMN decided_by INT NULL,
    ADD COLUMN decided_at DATETIME(6) NULL,
    ADD COLUMN decision_reason VARCHAR(1000) NULL,
    ADD COLUMN active_user_id INT GENERATED ALWAYS AS
      (CASE WHEN access_state='APPROVED' THEN user_id ELSE NULL END) STORED,
    ADD CONSTRAINT ck_membership_state CHECK (access_state IN ('APPROVED','REVOKED'));
UPDATE user_has_organize m JOIN `user` u ON u.id=m.user_id
JOIN (
    SELECT id,ROW_NUMBER() OVER (
        PARTITION BY user_id ORDER BY registered_date DESC,id DESC
    ) AS assignment_rank FROM user_has_organize
) latest ON latest.id=m.id AND latest.assignment_rank=1
SET m.access_state='APPROVED'
WHERE u.role_id=2 AND u.user_status_id=1;
CREATE UNIQUE INDEX uq_active_membership ON user_has_organize(active_user_id,organization_id);

ALTER TABLE `request` DROP INDEX uq_pending_coordinator,
    ADD COLUMN proposed_name VARCHAR(45) NULL,
    ADD COLUMN proposed_type_id INT NULL,
    ADD COLUMN contact_email VARCHAR(100) NULL,
    ADD COLUMN contact_phone VARCHAR(30) NULL,
    ADD COLUMN explanation TEXT NULL,
    ADD COLUMN pending_scope VARCHAR(100) GENERATED ALWAYS AS
      (CASE WHEN role_id=2 AND status_id=1 THEN
        CASE WHEN organization_id IS NOT NULL THEN CONCAT('org:',organization_id)
        ELSE CONCAT('proposal:',LOWER(TRIM(COALESCE(proposed_name,'')))) END ELSE NULL END) STORED,
    ADD UNIQUE KEY uq_pending_organization (pending_user_id,pending_scope),
    ADD CONSTRAINT fk_request_proposed_type FOREIGN KEY (proposed_type_id) REFERENCES org_type(id);
-- status lookup 4 is DRAFT; request revocation uses an explicit timestamp.
ALTER TABLE `request` ADD COLUMN revoked_at DATETIME(6) NULL;

CREATE TABLE private_document (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    purpose VARCHAR(16) NOT NULL,
    media_type VARCHAR(32) NOT NULL,
    byte_size INT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    content MEDIUMBLOB NOT NULL,
    created_at DATETIME(6) NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES `user`(id),
    CHECK (purpose IN ('AUTHORIZATION','EVENT')),
    CHECK (byte_size BETWEEN 1 AND 10485760)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE `request` ADD COLUMN proof_id BIGINT NULL,
    ADD CONSTRAINT fk_request_proof FOREIGN KEY (proof_id) REFERENCES private_document(id);

ALTER TABLE `event` ADD COLUMN organization_id INT NULL,
    ADD COLUMN published_revision_id BIGINT NULL,
    ADD COLUMN working_revision_id BIGINT NULL,
    ADD CONSTRAINT fk_event_organization FOREIGN KEY (organization_id) REFERENCES organization(id);
UPDATE `event` e JOIN (
    SELECT user_id,MIN(organization_id) organization_id FROM user_has_organize
    GROUP BY user_id HAVING COUNT(DISTINCT organization_id)=1
) m ON m.user_id=e.published_by SET e.organization_id=m.organization_id;

CREATE TABLE event_revision (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    version INT NOT NULL,
    content JSON NOT NULL,
    review_state VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    created_by INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    submitted_at DATETIME(6) NULL,
    reviewed_by INT NULL,
    reviewed_at DATETIME(6) NULL,
    reason VARCHAR(1000) NULL,
    UNIQUE KEY uq_event_version(event_id,version),
    FOREIGN KEY (event_id) REFERENCES `event`(id),
    FOREIGN KEY (created_by) REFERENCES `user`(id),
    CHECK (review_state IN ('DRAFT','PENDING','APPROVED','REJECTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE event_impression (
    event_id INT NOT NULL,
    session_hash CHAR(64) NOT NULL,
    last_seen_at DATETIME(6) NOT NULL,
    PRIMARY KEY(event_id,session_hash),
    FOREIGN KEY(event_id) REFERENCES `event`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE event_impression_count (
    event_id INT NOT NULL,
    measured_at DATETIME(6) NOT NULL,
    impressions INT NOT NULL,
    PRIMARY KEY(event_id,measured_at),
    FOREIGN KEY(event_id) REFERENCES `event`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE participant_campaign (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    organization_id INT NULL,
    created_by INT NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    scheduled_at DATETIME(6) NOT NULL,
    event_timezone VARCHAR(64) NOT NULL,
    campaign_state VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED',
    system_notice BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    started_at DATETIME(6) NULL,
    recipient_cursor INT NOT NULL DEFAULT 0,
    FOREIGN KEY(event_id) REFERENCES `event`(id),
    FOREIGN KEY(organization_id) REFERENCES organization(id),
    FOREIGN KEY(created_by) REFERENCES `user`(id),
    INDEX ix_campaign_ready(campaign_state,scheduled_at),
    CHECK(system_notice=TRUE OR organization_id IS NOT NULL),
    CHECK(campaign_state IN ('SCHEDULED','DISPATCHING','QUEUED','CANCELLED','BLOCKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE admin_email_outbox ADD COLUMN campaign_id BIGINT NULL,
    ADD COLUMN recipient_user_id INT NULL,
    ADD UNIQUE KEY uq_campaign_recipient(campaign_id,recipient_user_id),
    ADD CONSTRAINT fk_outbox_campaign FOREIGN KEY(campaign_id) REFERENCES participant_campaign(id);
