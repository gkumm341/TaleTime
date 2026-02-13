CREATE TABLE `user_generated_stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cache_key` text NOT NULL,
	`metadata_json` text NOT NULL,
	`story_json` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `user_generated_stories_cache_key_unique` ON `user_generated_stories` (`cache_key`);
