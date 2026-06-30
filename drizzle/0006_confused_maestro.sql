CREATE TABLE `forecast_meta_previsao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`repName` varchar(256) NOT NULL,
	`metaKg` int NOT NULL DEFAULT 0,
	`previsaoKg` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forecast_meta_previsao_id` PRIMARY KEY(`id`),
	CONSTRAINT `forecast_meta_previsao_repCode_unique` UNIQUE(`repCode`)
);
--> statement-breakpoint
CREATE INDEX `idx_meta_previsao_rep` ON `forecast_meta_previsao` (`repCode`);