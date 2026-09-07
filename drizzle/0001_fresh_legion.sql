CREATE TABLE `aion_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`action` varchar(220) NOT NULL,
	`riskLevel` enum('medium','high') NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `aion_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aion_audit_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`severity` enum('high','medium','low','info') NOT NULL,
	`title` varchar(220) NOT NULL,
	`detail` text NOT NULL,
	`evidence` text,
	`status` enum('open','accepted','resolved') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aion_audit_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aion_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`toolName` varchar(100) NOT NULL,
	`riskLevel` enum('low','medium','high') NOT NULL,
	`status` enum('completed','blocked','not_implemented','failed') NOT NULL,
	`input` text,
	`output` text,
	`approvalRequired` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aion_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aion_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`sourcePath` text NOT NULL,
	`sourceType` enum('server_path','git_url') NOT NULL,
	`status` enum('ready','needs_approval','error') NOT NULL DEFAULT 'ready',
	`summary` text,
	`structure` text,
	`dependencies` text,
	`entrypoints` text,
	`risks` text,
	`pending` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aion_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aion_session_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`key` varchar(160) NOT NULL,
	`value` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aion_session_memory_id` PRIMARY KEY(`id`)
);
