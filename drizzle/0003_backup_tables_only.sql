CREATE TABLE IF NOT EXISTS `upload_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`recordCount` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'success',
	`fileName` varchar(256),
	`createdBy` int,
	`notes` text,
	CONSTRAINT `upload_history_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `invoices_backup` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadHistoryId` int NOT NULL,
	`orderCode` varchar(64) NOT NULL,
	`orderItem` varchar(32) NOT NULL,
	`invoiceDate` timestamp NOT NULL,
	`year` int,
	`yearMonth` varchar(10),
	`month` varchar(4),
	`origin` varchar(64),
	`regionalManagement` varchar(128),
	`districtManagement` varchar(128),
	`supervision` varchar(128),
	`microRegion` varchar(128),
	`repName` varchar(256) NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`repStatus` varchar(32),
	`clientCodeDatasul` varchar(32),
	`clientCodeSAP` varchar(32),
	`clientGroupCodeSAP` varchar(32),
	`clientName` varchar(256) NOT NULL,
	`clientParentName` varchar(256),
	`clientCity` varchar(128),
	`clientState` varchar(4),
	`clientAddress` varchar(512),
	`clientPhone` varchar(64),
	`clientDocument` varchar(32),
	`atcResponsible` varchar(256),
	`salesChannel` varchar(128),
	`salesChannelGroup` varchar(128),
	`pittClassification` varchar(64),
	`productCodeDatasul` varchar(32),
	`productCodeSAP` varchar(32),
	`productName` varchar(256),
	`productGroup` varchar(128),
	`productLine` varchar(128),
	`quantity` decimal(18,4),
	`unit` varchar(32),
	`unitPrice` decimal(18,4),
	`totalPrice` decimal(18,2),
	`volumeKg` decimal(18,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_backup_id` PRIMARY KEY(`id`)
);

CREATE INDEX IF NOT EXISTS `idx_uh_date` ON `upload_history` (`uploadedAt`);
CREATE INDEX IF NOT EXISTS `idx_uh_status` ON `upload_history` (`status`);
CREATE INDEX IF NOT EXISTS `idx_ib_upload` ON `invoices_backup` (`uploadHistoryId`);
CREATE INDEX IF NOT EXISTS `idx_ib_order` ON `invoices_backup` (`orderCode`);
