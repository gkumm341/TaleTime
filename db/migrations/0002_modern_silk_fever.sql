CREATE TABLE IF NOT EXISTS `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`user_id` text DEFAULT 'default' NOT NULL,
	`added_at` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reading_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`user_id` text DEFAULT 'default' NOT NULL,
	`last_read_at` integer NOT NULL,
	`current_cfi` text,
	`progress_percent` integer DEFAULT 0,
	`total_reading_time` integer DEFAULT 0,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
