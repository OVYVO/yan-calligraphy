CREATE TABLE `character_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`char` text NOT NULL,
	`image_path` text NOT NULL,
	`thumb_path` text NOT NULL,
	`style` text DEFAULT '其他' NOT NULL,
	`source` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `character_assets_char_idx` ON `character_assets` (`char`);--> statement-breakpoint
CREATE INDEX `character_assets_style_idx` ON `character_assets` (`style`);--> statement-breakpoint
CREATE INDEX `character_assets_created_at_idx` ON `character_assets` (`created_at`);