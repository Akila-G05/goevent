-- Initial schema adapted from the legacy bootstrap dump.
-- Flyway selects the configured database; no fixed schema or personal/demo seed data.
-- Foreign key checks are temporarily disabled because the legacy table order
-- includes forward references. All retained seed rows are reference data.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;



-- Legacy table: audience
CREATE TABLE `audience` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

-- Legacy table: audience: ~3 rows (approximately)
INSERT INTO `audience` (`id`, `type`) VALUES
	(1, 'UNIVERSITY'),
	(2, 'PUBLIC'),
	(3, 'BOTH');

-- Legacy table: booking
CREATE TABLE `booking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_id` int NOT NULL,
  `booking_reference` varchar(45) NOT NULL,
  `total_amount` double NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_has_event_event2_idx` (`event_id`),
  KEY `fk_user_has_event_user2_idx` (`user_id`),
  CONSTRAINT `fk_user_has_event_event2` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`),
  CONSTRAINT `fk_user_has_event_user2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: booking: ~0 rows (approximately)

-- Legacy table: booking_item
CREATE TABLE `booking_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `ticket_id` int NOT NULL,
  `qty` varchar(45) NOT NULL,
  `unit_price` varchar(45) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_booking_item_booking1_idx` (`booking_id`),
  KEY `fk_booking_item_ticket1_idx` (`ticket_id`),
  CONSTRAINT `fk_booking_item_booking1` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `fk_booking_item_ticket1` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: booking_item: ~0 rows (approximately)

-- Legacy table: category
CREATE TABLE `category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4;

-- Legacy table: category: ~16 rows (approximately)
INSERT INTO `category` (`id`, `name`) VALUES
	(1, 'EDUCATION'),
	(2, 'TECHNOLOGY'),
	(3, 'MUSIC'),
	(4, 'CULTURAL'),
	(5, 'BUSINESS'),
	(6, 'SPORTS'),
	(7, 'WORKSHOP'),
	(8, 'CONFERENCE'),
	(9, 'SEMINAR'),
	(10, 'EXHIBITION'),
	(11, 'THEATRE'),
	(12, 'FESTIVAL'),
	(13, 'NETWORKING'),
	(14, 'COMPETITION'),
	(15, 'CAREER'),
	(16, 'OTHER');

-- Legacy table: event
CREATE TABLE `event` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `category_id` int NOT NULL,
  `venue_id` int NOT NULL,
  `event_status_id` int NOT NULL,
  `audience_id` int NOT NULL,
  `event_level_id` int NOT NULL,
  `img_id` int NOT NULL,
  `link_id` int NOT NULL,
  `published_by` int NOT NULL,
  `aproved_by` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_event_category1_idx` (`category_id`),
  KEY `fk_event_venue1_idx` (`venue_id`),
  KEY `fk_event_event_status1_idx` (`event_status_id`),
  KEY `fk_event_event_type1_idx` (`audience_id`),
  KEY `fk_event_event_level1_idx` (`event_level_id`),
  KEY `fk_event_img1_idx` (`img_id`),
  KEY `fk_event_link1_idx` (`link_id`),
  KEY `fk_event_user1_idx` (`published_by`),
  KEY `fk_event_user2_idx` (`aproved_by`),
  CONSTRAINT `fk_event_category1` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`),
  CONSTRAINT `fk_event_event_level1` FOREIGN KEY (`event_level_id`) REFERENCES `event_level` (`id`),
  CONSTRAINT `fk_event_event_status1` FOREIGN KEY (`event_status_id`) REFERENCES `status` (`id`),
  CONSTRAINT `fk_event_event_type1` FOREIGN KEY (`audience_id`) REFERENCES `audience` (`id`),
  CONSTRAINT `fk_event_img1` FOREIGN KEY (`img_id`) REFERENCES `img` (`id`),
  CONSTRAINT `fk_event_link1` FOREIGN KEY (`link_id`) REFERENCES `link` (`id`),
  CONSTRAINT `fk_event_user1` FOREIGN KEY (`published_by`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_event_user2` FOREIGN KEY (`aproved_by`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_event_venue1` FOREIGN KEY (`venue_id`) REFERENCES `venue` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: event: ~0 rows (approximately)

-- Legacy table: event_dates
CREATE TABLE `event_dates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `time` varchar(45) NOT NULL,
  `event_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_event_dates_event1_idx` (`event_id`),
  CONSTRAINT `fk_event_dates_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: event_dates: ~0 rows (approximately)

-- Legacy table: event_has_tags
CREATE TABLE `event_has_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `tags_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_event_has_tags_tags1_idx` (`tags_id`),
  KEY `fk_event_has_tags_event1_idx` (`event_id`),
  CONSTRAINT `fk_event_has_tags_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`),
  CONSTRAINT `fk_event_has_tags_tags1` FOREIGN KEY (`tags_id`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: event_has_tags: ~0 rows (approximately)

-- Legacy table: event_level
CREATE TABLE `event_level` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

-- Legacy table: event_level: ~3 rows (approximately)
INSERT INTO `event_level` (`id`, `name`) VALUES
	(1, 'LISTING_ONLY'),
	(2, 'FREE'),
	(3, 'PAYED');

-- Legacy table: event_verification
CREATE TABLE `event_verification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_event_verification_event1_idx` (`event_id`),
  KEY `fk_event_verification_user1_idx` (`user_id`),
  CONSTRAINT `fk_event_verification_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`),
  CONSTRAINT `fk_event_verification_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: event_verification: ~0 rows (approximately)

-- Legacy table: featured_events
CREATE TABLE `featured_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `display_order` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_featured_events_event1_idx` (`event_id`),
  CONSTRAINT `fk_featured_events_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: featured_events: ~0 rows (approximately)

-- Legacy table: img
CREATE TABLE `img` (
  `id` int NOT NULL AUTO_INCREMENT,
  `path` varchar(200) NOT NULL,
  `bannerpath` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: img: ~0 rows (approximately)

-- Legacy table: link
CREATE TABLE `link` (
  `id` int NOT NULL AUTO_INCREMENT,
  `link_name` varchar(45) NOT NULL,
  `link` varchar(200) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: link: ~0 rows (approximately)

-- Legacy table: offer
CREATE TABLE `offer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` double DEFAULT NULL,
  `offer_start_at` datetime DEFAULT NULL,
  `offer_end_at` datetime DEFAULT NULL,
  `audience_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_offer_audience1_idx` (`audience_id`),
  CONSTRAINT `fk_offer_audience1` FOREIGN KEY (`audience_id`) REFERENCES `audience` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: offer: ~0 rows (approximately)

-- Legacy table: org_type
CREATE TABLE `org_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

-- Legacy table: org_type: ~3 rows (approximately)
INSERT INTO `org_type` (`id`, `type`) VALUES
	(1, 'Club'),
	(2, 'Technology Community'),
	(3, 'Society');

-- Legacy table: organization
CREATE TABLE `organization` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `org_type_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_organization_org_type1_idx` (`org_type_id`),
  CONSTRAINT `fk_organization_org_type1` FOREIGN KEY (`org_type_id`) REFERENCES `org_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

-- Legacy table: organization: ~3 rows (approximately)
INSERT INTO `organization` (`id`, `name`, `org_type_id`) VALUES
	(4, 'Leo', 1),
	(5, 'VoiceTech', 3),
	(6, 'ICTS', 3);

-- Legacy table: p_status
CREATE TABLE `p_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

-- Legacy table: p_status: ~5 rows (approximately)
INSERT INTO `p_status` (`id`, `name`) VALUES
	(1, 'PENDING'),
	(2, 'SUCCESS'),
	(3, 'FAILED'),
	(4, 'CANCELLED'),
	(5, 'REFUNDED');

-- Legacy table: payment
CREATE TABLE `payment` (
  `id` int NOT NULL,
  `payment_method_id` int NOT NULL,
  `booking_id` int NOT NULL,
  `amount` varchar(45) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `p_status_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_payment_payment_method1_idx` (`payment_method_id`),
  KEY `fk_payment_booking1_idx` (`booking_id`),
  KEY `fk_payment_p_status1_idx` (`p_status_id`),
  CONSTRAINT `fk_payment_booking1` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`),
  CONSTRAINT `fk_payment_p_status1` FOREIGN KEY (`p_status_id`) REFERENCES `p_status` (`id`),
  CONSTRAINT `fk_payment_payment_method1` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: payment: ~0 rows (approximately)

-- Legacy table: payment_method
CREATE TABLE `payment_method` (
  `id` int NOT NULL AUTO_INCREMENT,
  `method` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COMMENT='							';

-- Legacy table: payment_method: ~0 rows (approximately)
INSERT INTO `payment_method` (`id`, `method`) VALUES
	(1, 'PayHere'),
	(2, 'Credit/Debit Card'),
	(3, 'Bank Transfer'),
	(4, 'Cash');

-- Legacy table: receipt
CREATE TABLE `receipt` (
  `id` int NOT NULL AUTO_INCREMENT,
  `path` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_receipt_payment1_idx` (`payment_id`),
  CONSTRAINT `fk_receipt_payment1` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: receipt: ~0 rows (approximately)

-- Legacy table: request
CREATE TABLE `request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `msg` varchar(200) DEFAULT NULL,
  `user_id` int NOT NULL,
  `aproved_by` int DEFAULT '0',
  `role_id` int NOT NULL,
  `status_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_request_user1_idx` (`user_id`),
  KEY `fk_request_user2_idx` (`aproved_by`),
  KEY `fk_request_role1_idx` (`role_id`),
  KEY `fk_request_status1_idx` (`status_id`),
  CONSTRAINT `fk_request_role1` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`),
  CONSTRAINT `fk_request_status1` FOREIGN KEY (`status_id`) REFERENCES `status` (`id`),
  CONSTRAINT `fk_request_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_request_user2` FOREIGN KEY (`aproved_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: request: ~0 rows (approximately)

-- Legacy table: role
CREATE TABLE `role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

-- Legacy table: role: ~3 rows (approximately)
INSERT INTO `role` (`id`, `type`) VALUES
	(1, 'USER'),
	(2, 'EVENT ORGANIZER'),
	(3, 'ADMIN'),
	(4, 'STUDENT'),
	(5, 'CONTRUBUTERS');

-- Legacy table: saved_event
CREATE TABLE `saved_event` (
  `user_id` int NOT NULL,
  `event_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`event_id`),
  KEY `fk_user_has_event_event1_idx` (`event_id`),
  KEY `fk_user_has_event_user1_idx` (`user_id`),
  CONSTRAINT `fk_user_has_event_event1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`),
  CONSTRAINT `fk_user_has_event_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: saved_event: ~0 rows (approximately)

-- Legacy table: status
CREATE TABLE `status` (
  `id` int NOT NULL,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: status: ~0 rows (approximately)
INSERT INTO `status` (`id`, `name`) VALUES
	(1, 'PENDING'),
	(2, 'APROVED'),
	(3, 'REJECTED');

-- Legacy table: student_detail
CREATE TABLE `student_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `index_no` varchar(45) NOT NULL,
  `uni_email` varchar(100) DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`,`user_id`),
  KEY `fk_student_detail_user1_idx` (`user_id`),
  CONSTRAINT `fk_student_detail_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: student_detail: ~0 rows (approximately)

-- Legacy table: tag_types
CREATE TABLE `tag_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4;

-- Legacy table: tag_types: ~0 rows (approximately)
INSERT INTO `tag_types` (`id`, `name`) VALUES
	(1, 'TOPIC'),
	(2, 'FORMAT'),
	(3, 'AUDIENCE'),
	(4, 'TOPIC'),
	(5, 'FORMAT'),
	(6, 'AUDIENCE'),
	(7, 'TOPIC'),
	(8, 'FORMAT'),
	(9, 'AUDIENCE');

-- Legacy table: tags
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `tag_types_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tags_tag_types1_idx` (`tag_types_id`),
  CONSTRAINT `fk_tags_tag_types1` FOREIGN KEY (`tag_types_id`) REFERENCES `tag_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4;

-- Legacy table: tags: ~6 rows (approximately)
INSERT INTO `tags` (`id`, `name`, `tag_types_id`) VALUES
	(7, 'Technology', 1),
	(8, 'Technology', 4),
	(9, 'Technology', 7),
	(10, 'Artificial Intelligence', 1),
	(11, 'Artificial Intelligence', 4),
	(12, 'Artificial Intelligence', 7),
	(13, 'Software Development', 1),
	(14, 'Software Development', 4),
	(15, 'Software Development', 7),
	(16, 'Cybersecurity', 1),
	(17, 'Cybersecurity', 4),
	(18, 'Cybersecurity', 7),
	(19, 'Business', 1),
	(20, 'Business', 4),
	(21, 'Business', 7),
	(22, 'Career', 1),
	(23, 'Career', 4),
	(24, 'Career', 7),
	(25, 'Networking', 1),
	(26, 'Networking', 4),
	(27, 'Networking', 7),
	(28, 'Workshop', 2),
	(29, 'Workshop', 5),
	(30, 'Workshop', 8),
	(31, 'Seminar', 2),
	(32, 'Seminar', 5),
	(33, 'Seminar', 8),
	(34, 'Conference', 2),
	(35, 'Conference', 5),
	(36, 'Conference', 8),
	(37, 'Exhibition', 2),
	(38, 'Exhibition', 5),
	(39, 'Exhibition', 8),
	(40, 'University Students', 3),
	(41, 'University Students', 6),
	(42, 'University Students', 9),
	(43, 'Public', 3),
	(44, 'Public', 6),
	(45, 'Public', 9);

-- Legacy table: test
CREATE TABLE `test` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

-- Legacy table: test: ~2 rows (approximately)

-- Legacy table: ticket
CREATE TABLE `ticket` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_dates_id` int NOT NULL,
  `qty` int NOT NULL,
  `price` double NOT NULL,
  `description` text,
  `sale_start_at` datetime NOT NULL,
  `sale_end_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ticket_event_dates1_idx` (`event_dates_id`),
  CONSTRAINT `fk_ticket_event_dates1` FOREIGN KEY (`event_dates_id`) REFERENCES `event_dates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: ticket: ~0 rows (approximately)

-- Legacy table: ticket_code
CREATE TABLE `ticket_code` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(45) DEFAULT NULL,
  `qr_token_hash` varchar(45) DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `expired_at` datetime DEFAULT NULL,
  `booking_item_id` int NOT NULL,
  `ticket_status_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ticket_code_booking_item1_idx` (`booking_item_id`),
  KEY `fk_ticket_status_ticket_status1_idx` (`ticket_status_id`),
  CONSTRAINT `fk_ticket_code_booking_item1` FOREIGN KEY (`booking_item_id`) REFERENCES `booking_item` (`id`),
  CONSTRAINT `fk_ticket_status_ticket_status1` FOREIGN KEY (`ticket_status_id`) REFERENCES `ticket_status` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: ticket_code: ~0 rows (approximately)

-- Legacy table: ticket_status
CREATE TABLE `ticket_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

-- Legacy table: ticket_status: ~0 rows (approximately)
INSERT INTO `ticket_status` (`id`, `name`) VALUES
	(1, 'ACTIVE'),
	(2, 'USED'),
	(3, 'CANCELLED'),
	(4, 'EXPIRED'),
	(5, 'REFUNDED');

-- Legacy table: university
CREATE TABLE `university` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4;

-- Legacy table: university: ~0 rows (approximately)
INSERT INTO `university` (`id`, `name`) VALUES
	(1, 'University of Sri Jayewardenepura'),
	(2, 'University of Colombo'),
	(3, 'University of Moratuwa'),
	(4, 'University of Kelaniya'),
	(5, 'University of Peradeniya'),
	(6, 'University of Ruhuna'),
	(7, 'University of Jaffna'),
	(8, 'Wayamba University of Sri Lanka'),
	(9, 'Sri Lanka Institute of Information Technology'),
	(10, 'NSBM Green University');

-- Legacy table: university_details
CREATE TABLE `university_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `index_no` varchar(45) NOT NULL,
  `university_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_university_details_university1_idx` (`university_id`),
  CONSTRAINT `fk_university_details_university1` FOREIGN KEY (`university_id`) REFERENCES `university` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: university_details: ~0 rows (approximately)

-- Legacy table: university_has_offer
CREATE TABLE `university_has_offer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `university_id` int NOT NULL,
  `offer_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_university_has_offer_offer1_idx` (`offer_id`),
  KEY `fk_university_has_offer_university1_idx` (`university_id`),
  CONSTRAINT `fk_university_has_offer_offer1` FOREIGN KEY (`offer_id`) REFERENCES `offer` (`id`),
  CONSTRAINT `fk_university_has_offer_university1` FOREIGN KEY (`university_id`) REFERENCES `university` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: university_has_offer: ~0 rows (approximately)

-- Legacy table: user
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fname` varchar(45) NOT NULL,
  `lname` varchar(45) NOT NULL,
  `email` varchar(100) NOT NULL,
  `registered_date` datetime NOT NULL,
  `v_code` varchar(45) DEFAULT NULL,
  `user_status_id` int NOT NULL,
  `role_id` int NOT NULL,
  `user_type_id` int NOT NULL,
  `google_sub` bigint DEFAULT NULL,
  `profile_img_url` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_User_user_status_idx` (`user_status_id`),
  KEY `fk_user_role1_idx` (`role_id`),
  KEY `fk_user_user_type1_idx` (`user_type_id`),
  CONSTRAINT `fk_user_role1` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`),
  CONSTRAINT `fk_User_user_status` FOREIGN KEY (`user_status_id`) REFERENCES `user_status` (`id`),
  CONSTRAINT `fk_user_user_type1` FOREIGN KEY (`user_type_id`) REFERENCES `university_details` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

-- Legacy table: user: ~1 rows (approximately)

-- Legacy table: user_has_organize
CREATE TABLE `user_has_organize` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `registered_date` datetime DEFAULT NULL,
  `organization_id` int NOT NULL,
  `position` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_has_organize_user1_idx` (`user_id`),
  KEY `fk_user_has_organize_organization1_idx` (`organization_id`),
  CONSTRAINT `fk_user_has_organize_organization1` FOREIGN KEY (`organization_id`) REFERENCES `organization` (`id`),
  CONSTRAINT `fk_user_has_organize_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: user_has_organize: ~0 rows (approximately)

-- Legacy table: user_status
CREATE TABLE `user_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

-- Legacy table: user_status: ~2 rows (approximately)
INSERT INTO `user_status` (`id`, `name`) VALUES
	(1, 'ACTIVE'),
	(2, 'SUSPENDED'),
	(3, 'PENDING_VERIFICATION');

-- Legacy table: venue
CREATE TABLE `venue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `address` varchar(150) DEFAULT NULL,
  `city` varchar(45) NOT NULL,
  `link` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Legacy table: venue: ~0 rows (approximately)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
