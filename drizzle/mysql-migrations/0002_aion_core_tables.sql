-- AION core project data tables.
-- Safe to review and apply as a controlled migration; this file is not executed by CI.
CREATE TABLE IF NOT EXISTS `aion_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ownerId` int NULL,
  `name` varchar(255) NOT NULL,
  `sourcePath` text NOT NULL,
  `sourceType` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ready',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aion_projects_owner_status` (`ownerId`, `status`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `aion_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `position` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aion_tasks_project_position` (`projectId`, `position`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `aion_executions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` int NOT NULL,
  `command` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL,
  `output` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aion_executions_project_created` (`projectId`, `createdAt`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `aion_memory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` int NOT NULL,
  `memoryKey` varchar(191) NOT NULL,
  `value` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aion_memory_project_key` (`projectId`, `memoryKey`)
) ENGINE=InnoDB;
