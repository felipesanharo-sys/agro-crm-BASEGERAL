CREATE TABLE `forecast_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repCode` varchar(32) NOT NULL,
	`repName` varchar(256) NOT NULL,
	`yearMonth` varchar(10) NOT NULL,
	`metaKg` decimal(18,2) DEFAULT 0,
	`previsaoKg` decimal(18,2) DEFAULT 0,
	`realizadoKg` decimal(18,2) DEFAULT 0,
	`emTelaKg` decimal(18,2) DEFAULT 0,
	`contatoSemanalKg` decimal(18,2) DEFAULT 0,
	`consumidorKg` decimal(18,2) DEFAULT 0,
	`revendaKg` decimal(18,2) DEFAULT 0,
	`industriaKg` decimal(18,2) DEFAULT 0,
	`necessidadeDiariaKg` decimal(18,2) DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forecast_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_forecast_rep` ON `forecast_data` (`repCode`);--> statement-breakpoint
CREATE INDEX `idx_forecast_month` ON `forecast_data` (`yearMonth`);--> statement-breakpoint
CREATE INDEX `idx_forecast_rep_month` ON `forecast_data` (`repCode`,`yearMonth`);