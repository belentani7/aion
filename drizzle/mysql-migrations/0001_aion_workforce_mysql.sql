-- AION Workforce MySQL/TiDB baseline.
-- The managed database already contains `users`; all other product tables are created idempotently.

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `stripeCustomerId` varchar(255) NULL,
  `stripeSubscriptionId` varchar(255) NULL,
  `plan` enum('free','pro','enterprise') NOT NULL DEFAULT 'free',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_stripeCustomerId_unique` (`stripeCustomerId`),
  UNIQUE KEY `tenants_stripeSubscriptionId_unique` (`stripeSubscriptionId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tenant_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('owner','admin','manager','employee') NOT NULL DEFAULT 'employee',
  `status` enum('active','invited','suspended') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_members_tenant_user_unique` (`tenantId`,`userId`),
  KEY `tenant_members_user_lookup` (`userId`,`status`),
  CONSTRAINT `tenant_members_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_members_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_tenant_name_unique` (`tenantId`,`name`),
  KEY `departments_tenant_lookup` (`tenantId`),
  CONSTRAINT `departments_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `departmentId` int NULL,
  `name` varchar(255) NOT NULL,
  `role` enum('owner','admin','manager','employee') NOT NULL DEFAULT 'employee',
  `hourlyRate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `active` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employees_tenant_lookup` (`tenantId`,`active`),
  KEY `employees_department_lookup` (`tenantId`,`departmentId`),
  CONSTRAINT `employees_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employees_department_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `employeeId` int NULL,
  `departmentId` int NULL,
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NOT NULL,
  `status` enum('scheduled','completed','cancelled','pending_approval') NOT NULL DEFAULT 'scheduled',
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `shifts_tenant_time_lookup` (`tenantId`,`startTime`,`endTime`),
  KEY `shifts_employee_time_lookup` (`tenantId`,`employeeId`,`startTime`),
  CONSTRAINT `shifts_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shifts_employee_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `shifts_department_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `payroll_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `employeeId` int NOT NULL,
  `periodStart` timestamp NOT NULL,
  `periodEnd` timestamp NOT NULL,
  `hoursWorked` decimal(10,2) NOT NULL,
  `totalAmount` decimal(12,2) NOT NULL,
  `hash` varchar(64) NOT NULL,
  `payrollDate` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payroll_tenant_period_lookup` (`tenantId`,`periodStart`,`periodEnd`),
  KEY `payroll_employee_period_lookup` (`tenantId`,`employeeId`,`periodEnd`),
  CONSTRAINT `payroll_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_employee_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `incidents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `employeeId` int NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` enum('open','investigating','resolved') NOT NULL DEFAULT 'open',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `incidents_tenant_lookup` (`tenantId`,`status`,`createdAt`),
  KEY `incidents_employee_lookup` (`tenantId`,`employeeId`,`createdAt`),
  CONSTRAINT `incidents_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `incidents_employee_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `eventType` enum('shift_created','shift_updated','shift_deleted','payroll_calculated','employee_created','employee_updated','employee_deleted','incident_created','incident_updated','tenant_created','member_added','member_role_updated','plan_updated') NOT NULL,
  `payload` json NOT NULL,
  `previousHash` varchar(64) NULL,
  `currentHash` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_tenant_chain_lookup` (`tenantId`,`id`),
  KEY `audit_current_hash_lookup` (`currentHash`),
  CONSTRAINT `audit_tenant_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id` varchar(255) NOT NULL,
  `type` varchar(120) NOT NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;
