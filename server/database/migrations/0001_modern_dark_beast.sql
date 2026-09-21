CREATE TABLE `compositions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`layout_type` text NOT NULL,
	`layout_config` text NOT NULL,
	`items` text NOT NULL,
	`export_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `compositions_updated_at_idx` ON `compositions` (`updated_at`);