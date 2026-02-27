CREATE TABLE `client_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientCodeSAP` varchar(32) NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`actionType` enum('em_acao','pedido_na_tela','excluido','reset') NOT NULL,
	`note` text,
	`previousStatus` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderCode` varchar(64) NOT NULL,
	`orderItem` varchar(32) NOT NULL,
	`invoiceDate` timestamp NOT NULL,
	`yearMonth` varchar(10),
	`repCode` varchar(32) NOT NULL,
	`repName` varchar(256) NOT NULL,
	`clientCodeSAP` varchar(32),
	`clientName` varchar(256) NOT NULL,
	`salesChannel` varchar(128),
	`productName` varchar(256) NOT NULL,
	`kgInvoiced` decimal(14,2) NOT NULL,
	`revenueNoTax` decimal(14,2),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rc_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`token` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	`usedByUserId` int,
	CONSTRAINT `rc_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `rc_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `rep_aliases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`repName` varchar(256) NOT NULL,
	`alias` varchar(128) NOT NULL,
	`parentRepCode` varchar(32),
	`neCode` varchar(32),
	CONSTRAINT `rep_aliases_id` PRIMARY KEY(`id`),
	CONSTRAINT `rep_aliases_repCode_unique` UNIQUE(`repCode`)
);
--> statement-breakpoint
CREATE TABLE `sales_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`yearMonth` varchar(7) NOT NULL,
	`goalKg` decimal(14,2) NOT NULL,
	CONSTRAINT `sales_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_goal` UNIQUE(`repCode`,`yearMonth`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `repCode` varchar(32);--> statement-breakpoint
CREATE INDEX `idx_ca_client` ON `client_actions` (`clientCodeSAP`,`repCode`);--> statement-breakpoint
CREATE INDEX `idx_inv_order` ON `invoices` (`orderCode`,`orderItem`);--> statement-breakpoint
CREATE INDEX `idx_inv_rep` ON `invoices` (`repCode`);--> statement-breakpoint
CREATE INDEX `idx_inv_client` ON `invoices` (`clientCodeSAP`);--> statement-breakpoint
CREATE INDEX `idx_inv_date` ON `invoices` (`invoiceDate`);--> statement-breakpoint
CREATE INDEX `idx_inv_ym` ON `invoices` (`yearMonth`);--> statement-breakpoint
CREATE INDEX `idx_invite_token` ON `rc_invites` (`token`);--> statement-breakpoint
CREATE INDEX `idx_invite_rep` ON `rc_invites` (`repCode`);