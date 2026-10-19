CREATE TABLE `absences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`employeeId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `absences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collective_agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`rules` json NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collective_agreements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `absences` ADD CONSTRAINT `absences_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `absences` ADD CONSTRAINT `absences_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collective_agreements` ADD CONSTRAINT `collective_agreements_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `absences_tenant_lookup` ON `absences` (`tenantId`,`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `agreements_tenant_lookup` ON `collective_agreements` (`tenantId`,`active`);