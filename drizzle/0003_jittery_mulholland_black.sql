ALTER TABLE `aion_audit_findings` ADD `priority` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `aion_audit_findings` ADD `impact` varchar(32) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `aion_audit_findings` ADD `effort` varchar(32) DEFAULT 'medium' NOT NULL;