CREATE TABLE `scan_findings` (
	`id` varchar(36) NOT NULL,
	`scanId` varchar(36) NOT NULL,
	`findingType` varchar(50) NOT NULL,
	`value` varchar(500) NOT NULL,
	`severity` enum('info','low','medium','high','critical') DEFAULT 'info',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_results` (
	`id` varchar(36) NOT NULL,
	`scanId` varchar(36) NOT NULL,
	`toolName` varchar(100) NOT NULL,
	`resultType` varchar(50) NOT NULL,
	`data` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`target` varchar(255) NOT NULL,
	`status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`totalSteps` int NOT NULL DEFAULT 4,
	`currentStep` varchar(100),
	`resultsPath` text,
	`reportPath` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
