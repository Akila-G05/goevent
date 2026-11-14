-- Preserve all existing IDs and history. Unknown historic times/currencies stay NULL.
CREATE TABLE admin_mutex (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO admin_mutex VALUES (1);

ALTER TABLE `user` ADD COLUMN disabled_reason VARCHAR(1000) NULL;
ALTER TABLE `user` ADD COLUMN coordinator_previous_role_id INT NULL,
    ADD CONSTRAINT ck_coordinator_previous_role CHECK
        (coordinator_previous_role_id IS NULL OR coordinator_previous_role_id IN (1,4));
-- Existing duplicate emails require operator reconciliation; never choose a winner.
CREATE UNIQUE INDEX uq_user_email ON `user` (email);
ALTER TABLE `request`
    ADD COLUMN organization_id INT NULL,
    ADD COLUMN position VARCHAR(45) NULL,
    ADD COLUMN created_at DATETIME(6) NULL,
    ADD COLUMN reviewed_at DATETIME(6) NULL,
    ADD COLUMN decision_reason VARCHAR(1000) NULL,
    ADD COLUMN pending_user_id INT GENERATED ALWAYS AS
        (CASE WHEN role_id=2 AND status_id=1 THEN user_id ELSE NULL END) STORED,
    ADD UNIQUE KEY uq_pending_coordinator (pending_user_id),
    ADD CONSTRAINT fk_request_organization FOREIGN KEY (organization_id) REFERENCES organization(id);

-- Review state remains in event_status_id; DRAFT extends the existing lookup.
INSERT INTO `status` (id,name) VALUES (4,'DRAFT');
ALTER TABLE `event`
    ADD COLUMN created_at DATETIME(6) NULL,
    ADD COLUMN starts_at DATETIME(6) NULL,
    ADD COLUMN ends_at DATETIME(6) NULL,
    ADD COLUMN disabled_at DATETIME(6) NULL,
    ADD COLUMN moderation_reason VARCHAR(1000) NULL,
    ADD COLUMN revision INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_event_schedule CHECK
        ((starts_at IS NULL AND ends_at IS NULL) OR
         (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at > starts_at));
ALTER TABLE payment ADD COLUMN currency CHAR(3) NULL;
-- Set defaults only after adding nullable fields so old records are not guessed.
ALTER TABLE payment ALTER COLUMN currency SET DEFAULT 'LKR';
ALTER TABLE `event` ALTER COLUMN created_at SET DEFAULT (UTC_TIMESTAMP(6));

CREATE TABLE admin_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NOT NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id BIGINT NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX ix_audit_time (created_at),
    INDEX ix_audit_target (target_type,target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE admin_email_outbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    attempts INT NOT NULL DEFAULT 0,
    available_at DATETIME(6) NOT NULL,
    leased_at DATETIME(6) NULL,
    provider_operation_id VARCHAR(200) NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX ix_outbox_ready (status,available_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contact_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    replied_at DATETIME(6) NULL,
    replied_by INT NULL,
    reply_body TEXT NULL,
    INDEX ix_contact_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
