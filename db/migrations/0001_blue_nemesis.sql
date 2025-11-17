CREATE TABLE `reading_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`user_id` text DEFAULT 'default' NOT NULL,
	`start_cfi` text,
	`end_cfi` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`words_read` integer,
	`calculated_wpm` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
