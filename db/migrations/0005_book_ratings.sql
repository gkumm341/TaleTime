CREATE TABLE `book_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`user_id` text DEFAULT 'default' NOT NULL,
	`rating` integer NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `book_ratings_user_book_unique` ON `book_ratings` (`user_id`,`book_id`);
