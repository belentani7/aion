CREATE TABLE `aion_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`title` varchar(220) NOT NULL,
	`status` enum('planned','running','completed','blocked','not_implemented') NOT NULL DEFAULT 'planned',
	`riskLevel` enum('low','medium','high') NOT NULL DEFAULT 'low',
	`dependsOn` text,
	`result` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aion_tasks_id` PRIMARY KEY(`id`)
);
