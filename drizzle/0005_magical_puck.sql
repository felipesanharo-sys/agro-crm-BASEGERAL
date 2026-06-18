CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`companyName` varchar(256) NOT NULL,
	`contactName` varchar(256),
	`channel` enum('revenda','consumidor','industria') NOT NULL,
	`potentialKg` decimal(14,2),
	`potentialBrl` decimal(14,2),
	`stage` enum('contato_inicial','proposta_enviada','em_negociacao','ganho','perdido') NOT NULL DEFAULT 'contato_inicial',
	`notes` text,
	`nextContactDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_prospect_rep` ON `prospects` (`repCode`);--> statement-breakpoint
CREATE INDEX `idx_prospect_stage` ON `prospects` (`stage`);