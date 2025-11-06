CREATE TABLE `books` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`authors` text,
	`languages` text,
	`subjects` text,
	`cover_url` text,
	`txt_url` text,
	`epub_url` text,
	`download_count` integer DEFAULT 0,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `cache_manifest` (
	`book_id` integer PRIMARY KEY NOT NULL,
	`epub_blob_key` text,
	`txt_blob_key` text,
	`last_checked` integer,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `estimates` (
	`book_id` integer PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`bytes` integer,
	`sample_bytes` integer,
	`words` integer,
	`minutes` integer NOT NULL,
	`wpm` integer DEFAULT 160 NOT NULL,
	`computed_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
